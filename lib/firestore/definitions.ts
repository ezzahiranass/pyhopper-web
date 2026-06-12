import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { createProjectEntry, type ProjectIndexEntry } from "@/lib/graph/projectStorage";

const DEFINITION_SCHEMA_VERSION = 1;
const ARTIFACT_SCHEMA_VERSION = 1;
type ArtifactId = "graph" | "render" | "scene" | "source";

type DefinitionMetadata = ProjectIndexEntry & {
  createdBy: string;
  isPublic: boolean;
  schemaVersion: number;
};
type DefinitionMetadataPayload = Partial<Omit<DefinitionMetadata, "createdBy">> & { createdBy?: unknown };

export type DefinitionDocument = DefinitionMetadata & {
  graphExport: unknown | null;
  selection: unknown | null;
  snapshot: unknown | null;
};

export type DefinitionSummary = ProjectIndexEntry & Pick<DefinitionMetadata, "createdBy" | "isPublic">;

function definitionsCollection() {
  return collection(db, "definitions");
}

function definitionDoc(definitionId: string) {
  return doc(db, "definitions", definitionId);
}

function artifactsCollection(definitionId: string) {
  return collection(db, "definitions", definitionId, "artifacts");
}

function artifactDoc(definitionId: string, artifactId: ArtifactId) {
  return doc(db, "definitions", definitionId, "artifacts", artifactId);
}

function userDoc(userId: string) {
  return doc(db, "users", userId);
}

function legacyDefinitionsCollection(userId: string) {
  return collection(db, "users", userId, "definitions");
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeMetadata(
  definitionId: string,
  payload: DefinitionMetadataPayload | undefined,
): DefinitionMetadata {
  const fallback = Date.now();
  const createdAt = normalizeTimestamp(payload?.createdAt, fallback);

  return {
    id: definitionId,
    name: typeof payload?.name === "string" && payload.name.trim() ? payload.name : "Untitled",
    createdAt,
    updatedAt: normalizeTimestamp(payload?.updatedAt, createdAt),
    createdBy:
      typeof payload?.createdBy === "string"
        ? payload.createdBy
        : isRecord(payload?.createdBy) && typeof payload.createdBy.id === "string"
          ? payload.createdBy.id
          : "",
    isPublic: payload?.isPublic === true,
    schemaVersion: normalizeTimestamp(payload?.schemaVersion, DEFINITION_SCHEMA_VERSION),
  };
}

function sourceFromArtifact(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.files)) {
    return null;
  }

  const pythonFile = payload.files.find(
    (file) => isRecord(file) && typeof file.path === "string" && file.path.endsWith(".py"),
  );
  return isRecord(pythonFile) && typeof pythonFile.content === "string" ? pythonFile.content : null;
}

function normalizeDefinitionDocument(
  definitionId: string,
  metadataPayload: DefinitionMetadataPayload | undefined,
  artifacts: Record<string, DocumentData>,
): DefinitionDocument {
  const metadata = normalizeMetadata(definitionId, metadataPayload);
  const graph = isRecord(artifacts.graph) ? artifacts.graph : null;
  const scene = isRecord(artifacts.scene) ? artifacts.scene : null;
  const render = isRecord(artifacts.render) ? artifacts.render : null;
  const generatedPython = sourceFromArtifact(artifacts.source);
  const graphId = typeof graph?.graphId === "string" ? graph.graphId : definitionId;
  const graphSchemaVersion = normalizeTimestamp(graph?.graphSchemaVersion, 2);

  const snapshot = graph?.flow
    ? {
        schemaVersion: graphSchemaVersion,
        graphId,
        flow: graph.flow,
        scene: scene?.scene ?? { schemaVersion: 3, objects: {} },
      }
    : null;
  const graphExport =
    typeof render?.modelUrl === "string" && render.modelUrl
      ? {
          schemaVersion: graphSchemaVersion,
          graphId,
          modelUrl: render.modelUrl,
          generatedPython,
          renderManifest: render.renderManifest ?? null,
        }
      : null;

  return {
    ...metadata,
    graphExport,
    selection: graph?.selection ?? null,
    snapshot,
  };
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const sanitizedItem = sanitizeFirestoreValue(item);
      return sanitizedItem === undefined ? [] : [sanitizedItem];
    });
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(([key, entryValue]) => {
        const sanitizedEntryValue = sanitizeFirestoreValue(entryValue);
        return sanitizedEntryValue === undefined ? [] : [[key, sanitizedEntryValue]];
      }),
    );
  }

  return value;
}

function sanitizeFirestorePayload<T extends Record<string, unknown>>(payload: T): T {
  return sanitizeFirestoreValue(payload) as T;
}

function metadataPayload(definition: DefinitionDocument) {
  return {
    id: definition.id,
    name: definition.name,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
    createdBy: userDoc(definition.createdBy),
    isPublic: definition.isPublic,
    schemaVersion: DEFINITION_SCHEMA_VERSION,
  };
}

function setUserInBatch(batch: ReturnType<typeof writeBatch>, userId: string, now: number) {
  batch.set(userDoc(userId), { id: userId, updatedAt: now }, { merge: true });
}

function setSnapshotInBatch(
  batch: ReturnType<typeof writeBatch>,
  definitionId: string,
  snapshot: unknown,
  now: number,
) {
  if (!isRecord(snapshot)) {
    return;
  }

  batch.set(
    artifactDoc(definitionId, "graph"),
    sanitizeFirestorePayload({
      kind: "graph",
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      graphSchemaVersion: snapshot.schemaVersion ?? 2,
      graphId: snapshot.graphId ?? definitionId,
      flow: snapshot.flow ?? null,
      updatedAt: now,
    }),
    { merge: true },
  );

  if (snapshot.scene) {
    batch.set(
      artifactDoc(definitionId, "scene"),
      sanitizeFirestorePayload({
        kind: "scene",
        schemaVersion: ARTIFACT_SCHEMA_VERSION,
        scene: snapshot.scene,
        updatedAt: now,
      }),
      { merge: true },
    );
  }
}

function setExportInBatch(
  batch: ReturnType<typeof writeBatch>,
  definitionId: string,
  graphExport: unknown,
  now: number,
) {
  if (!isRecord(graphExport)) {
    return;
  }

  batch.set(
    artifactDoc(definitionId, "render"),
    sanitizeFirestorePayload({
      kind: "render",
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      graphId: graphExport.graphId ?? definitionId,
      modelUrl: graphExport.modelUrl ?? null,
      renderManifest: graphExport.renderManifest ?? null,
      updatedAt: now,
    }),
    { merge: true },
  );

  if (typeof graphExport.generatedPython === "string") {
    batch.set(
      artifactDoc(definitionId, "source"),
      sanitizeFirestorePayload({
        kind: "source-code",
        schemaVersion: ARTIFACT_SCHEMA_VERSION,
        language: "python",
        files: [{ path: "definition.py", content: graphExport.generatedPython }],
        updatedAt: now,
      }),
      { merge: true },
    );
  }
}

export function createDefinitionDraft(userId: string, name?: string): DefinitionDocument {
  const definitionId = doc(definitionsCollection()).id;
  return {
    ...createProjectEntry(name, definitionId),
    createdBy: userId,
    isPublic: false,
    schemaVersion: DEFINITION_SCHEMA_VERSION,
    graphExport: null,
    selection: null,
    snapshot: null,
  };
}

export async function saveDefinition(userId: string, definition: DefinitionDocument) {
  const batch = writeBatch(db);
  const now = Date.now();
  setUserInBatch(batch, userId, now);
  batch.set(definitionDoc(definition.id), metadataPayload({ ...definition, createdBy: userId }));
  setSnapshotInBatch(batch, definition.id, definition.snapshot, now);
  setExportInBatch(batch, definition.id, definition.graphExport, now);
  if (definition.selection) {
    batch.set(artifactDoc(definition.id, "graph"), { selection: definition.selection, updatedAt: now }, { merge: true });
  }
  await batch.commit();
}

export async function renameDefinition(_userId: string, definitionId: string, name: string) {
  await updateDoc(
    definitionDoc(definitionId),
    sanitizeFirestorePayload({
      name,
      updatedAt: Date.now(),
    }),
  );
}

export async function setDefinitionVisibility(_userId: string, definitionId: string, isPublic: boolean) {
  await updateDoc(definitionDoc(definitionId), { isPublic, updatedAt: Date.now() });
}

export async function deleteDefinition(_userId: string, definitionId: string) {
  const artifacts = await getDocs(artifactsCollection(definitionId));
  for (let index = 0; index < artifacts.docs.length; index += 450) {
    const batch = writeBatch(db);
    for (const artifact of artifacts.docs.slice(index, index + 450)) {
      batch.delete(artifact.ref);
    }
    await batch.commit();
  }
  await deleteDoc(definitionDoc(definitionId));
}

export async function saveDefinitionSnapshot(userId: string, definitionId: string, snapshot: unknown) {
  const batch = writeBatch(db);
  const now = Date.now();
  setUserInBatch(batch, userId, now);
  batch.set(definitionDoc(definitionId), { updatedAt: now }, { merge: true });
  setSnapshotInBatch(batch, definitionId, snapshot, now);
  await batch.commit();
}

export async function saveDefinitionExport(userId: string, definitionId: string, graphExport: unknown) {
  const batch = writeBatch(db);
  const now = Date.now();
  setUserInBatch(batch, userId, now);
  batch.set(definitionDoc(definitionId), { updatedAt: now }, { merge: true });
  setExportInBatch(batch, definitionId, graphExport, now);
  await batch.commit();
}

export async function saveDefinitionSelection(userId: string, definitionId: string, selection: unknown) {
  const batch = writeBatch(db);
  const now = Date.now();
  setUserInBatch(batch, userId, now);
  batch.set(
    artifactDoc(definitionId, "graph"),
    sanitizeFirestorePayload({
      kind: "graph",
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      graphId: definitionId,
      selection,
      updatedAt: now,
    }),
    { merge: true },
  );
  await batch.commit();
}

async function migrateLegacyDefinitions(userId: string) {
  const legacySnapshot = await getDocs(legacyDefinitionsCollection(userId));
  await Promise.all(
    legacySnapshot.docs.map(async (legacyDoc) => {
      if ((await getDoc(definitionDoc(legacyDoc.id))).exists()) {
        return;
      }
      const payload = legacyDoc.data() as Partial<DefinitionDocument>;
      const definition = {
        ...normalizeDefinitionDocument(legacyDoc.id, { ...payload, createdBy: userId }, {}),
        createdBy: userId,
        isPublic: false,
        graphExport: payload.graphExport ?? null,
        selection: payload.selection ?? null,
        snapshot: payload.snapshot ?? null,
      };
      await saveDefinition(userId, definition);
    }),
  );
}

function documentsFromSnapshot(snapshot: QuerySnapshot<DocumentData>) {
  return new Map(snapshot.docs.map((entry) => [entry.id, entry.data()]));
}

export function subscribeToDefinitions(
  userId: string,
  onChange: (definitions: DefinitionDocument[]) => void,
): Unsubscribe {
  let ownedDefinitions = new Map<string, DocumentData>();
  let publicDefinitions = new Map<string, DocumentData>();
  const artifactsByDefinition = new Map<string, Record<string, DocumentData>>();
  const artifactUnsubscribers = new Map<string, Unsubscribe>();

  const emit = () => {
    const metadataByDefinition = new Map([...publicDefinitions, ...ownedDefinitions]);
    if ([...metadataByDefinition.keys()].some((definitionId) => !artifactsByDefinition.has(definitionId))) {
      return;
    }
    const definitions = [...metadataByDefinition.entries()]
      .map(([definitionId, metadata]) =>
        normalizeDefinitionDocument(definitionId, metadata, artifactsByDefinition.get(definitionId) ?? {}),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);
    onChange(definitions);
  };

  const syncArtifactSubscriptions = () => {
    const definitionIds = new Set([...publicDefinitions.keys(), ...ownedDefinitions.keys()]);

    for (const [definitionId, unsubscribe] of artifactUnsubscribers) {
      if (!definitionIds.has(definitionId)) {
        unsubscribe();
        artifactUnsubscribers.delete(definitionId);
        artifactsByDefinition.delete(definitionId);
      }
    }

    for (const definitionId of definitionIds) {
      if (artifactUnsubscribers.has(definitionId)) {
        continue;
      }
      artifactUnsubscribers.set(
        definitionId,
        onSnapshot(artifactsCollection(definitionId), (snapshot) => {
          artifactsByDefinition.set(
            definitionId,
            Object.fromEntries(snapshot.docs.map((artifact) => [artifact.id, artifact.data()])),
          );
          emit();
        }),
      );
    }
    if (definitionIds.size === 0) {
      emit();
    }
  };

  const ownedUnsubscribe = onSnapshot(
    query(definitionsCollection(), where("createdBy", "==", userDoc(userId))),
    (snapshot) => {
      ownedDefinitions = documentsFromSnapshot(snapshot);
      syncArtifactSubscriptions();
    },
  );
  const publicUnsubscribe = onSnapshot(
    query(definitionsCollection(), where("isPublic", "==", true)),
    (snapshot) => {
      publicDefinitions = documentsFromSnapshot(snapshot);
      syncArtifactSubscriptions();
    },
  );

  void migrateLegacyDefinitions(userId).catch((error) => {
    console.error("Failed to migrate legacy definitions", error);
  });

  return () => {
    ownedUnsubscribe();
    publicUnsubscribe();
    for (const unsubscribe of artifactUnsubscribers.values()) {
      unsubscribe();
    }
  };
}
