"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";

import {
  type ComponentNodeData,
  type GraphDocument,
  type GraphImportResponse,
  type GraphEdge,
  type GraphExportResponse,
  type GraphNode,
  type GraphViewport,
  type PortOperation,
  type PyhopperComponentDefinition,
  type RenderManifest,
  OBJECT_REFERENCE_DEFINITION,
} from "@/lib/graph/types";
import { useProjects } from "@/components/providers/ProjectsProvider";
import { createEmptySceneDocument, normalizeSceneDocument } from "@/lib/scene/scene";
import type { SceneDocument } from "@/lib/scene/types";

const GRAPH_SNAPSHOT_SCHEMA_VERSION = 2;
const GRAPH_SETTINGS_STORAGE_KEY = "pyhopper.graph.settings.v2";
const DEFAULT_VIEWPORT: GraphViewport = { x: 0, y: 0, zoom: 1 };
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type StoredGraphSnapshot = {
  schemaVersion: 2;
  graphId: string;
  scene: SceneDocument;
  flow: {
    nodes: Node<ComponentNodeData>[];
    edges: Edge[];
    viewport: GraphViewport;
  };
};

type StoredGraphExport = {
  schemaVersion: 2;
  graphId: string;
  modelUrl: string;
  generatedPython: string | null;
  renderManifest: RenderManifest | null;
};

type StoredGraphSettings = {
  schemaVersion: 2;
  autosaveEnabled: boolean;
  realtimeGenerationEnabled: boolean;
};

type StoredGraphSelection = {
  schemaVersion: 2;
  graphId: string;
  nodeIds: string[];
};

type GraphEditorContextValue = {
  edges: Edge[];
  exportError: string | null;
  generatedPython: string | null;
  graphDocument: GraphDocument;
  graphId: string;
  autosaveEnabled: boolean;
  hasStoredSnapshot: boolean;
  hasUnsavedChanges: boolean;
  isExporting: boolean;
  isHydrated: boolean;
  isSaving: boolean;
  modelUrl: string | null;
  nodes: Node<ComponentNodeData>[];
  realtimeGenerationEnabled: boolean;
  renderManifest: RenderManifest | null;
  scene: SceneDocument;
  addObjectReferenceNode: (objectId: string) => void;
  deleteSceneObjects: (objectIds: string[]) => void;
  saveCurrentDefinition: () => Promise<void>;
  selectedNodeIds: string[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setNodes: Dispatch<SetStateAction<Node<ComponentNodeData>[]>>;
  setScene: Dispatch<SetStateAction<SceneDocument>>;
  setAutosaveEnabled: (enabled: boolean) => void;
  setNodePreviewEnabled: (nodeId: string, enabled: boolean) => void;
  setNodeValue: (nodeId: string, valueKey: string, value: unknown) => void;
  setPortOperation: (nodeId: string, portKind: "input" | "output", portName: string, operation: PortOperation) => void;
  setRealtimeGenerationEnabled: (enabled: boolean) => void;
  setViewport: (viewport: GraphViewport) => void;
  viewport: GraphViewport;
  exportGraph: () => Promise<void>;
  requestRealtimeGeneration: () => void;
  importGraph: (payload: GraphImportResponse) => void;
  saveGraphSnapshot: (flow: {
    nodes: Node<ComponentNodeData>[];
    edges: Edge[];
    viewport: GraphViewport;
  }) => void;
};

const GraphEditorContext = createContext<GraphEditorContextValue | null>(null);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function serializeComparable(value: unknown): string {
  return JSON.stringify(value, (_key, currentValue) => {
    if (currentValue === undefined) {
      return null;
    }

    if (Array.isArray(currentValue)) {
      return currentValue;
    }

    if (isPlainObject(currentValue)) {
      return Object.fromEntries(
        Object.entries(currentValue)
          .filter(([, entryValue]) => entryValue !== undefined)
          .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
      );
    }

    return currentValue;
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultSliderValue(definition: PyhopperComponentDefinition): number | null {
  if (definition.frontend_preset !== "number-slider") {
    return null;
  }

  const config = definition.frontend_config ?? {};
  const min = isFiniteNumber(config.min) ? config.min : 0;
  const max = isFiniteNumber(config.max) ? config.max : 1;
  const fallbackValue = min <= max ? min : max;
  return isFiniteNumber(config.value) ? config.value : fallbackValue;
}

const PORT_OPERATION_VALUES = new Set<string>(["Graft", "Simplify", "Flatten", "Reverse", "Reparametrize"]);

function sanitizePortOperations(raw: unknown): Record<string, PortOperation> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, PortOperation> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && PORT_OPERATION_VALUES.has(value)) {
      result[key] = value as PortOperation;
    }
  }
  return result;
}

function sanitizeNodeValues(definition: PyhopperComponentDefinition, values: unknown): Record<string, unknown> {
  const nextValues =
    values && typeof values === "object" && !Array.isArray(values)
      ? { ...(values as Record<string, unknown>) }
      : {};

  if (definition.frontend_preset === "number-slider") {
    const primaryOutput = definition.outputs[0]?.name ?? "value";
    const sliderValue = nextValues[primaryOutput];
    const fallbackValue = defaultSliderValue(definition);

    return {
      [primaryOutput]:
        isFiniteNumber(sliderValue) && fallbackValue !== null ? sliderValue : fallbackValue ?? 0,
    };
  }

  return nextValues;
}

function sanitizeStoredNode(node: Node<ComponentNodeData>): Node<ComponentNodeData> {
  return {
    ...node,
    id: node.id,
    type: node.type ?? "component",
    position: node.position,
    data: {
      definition: node.data.definition,
      previewEnabled: typeof node.data.previewEnabled === "boolean" ? node.data.previewEnabled : true,
      previews: {},
      values: sanitizeNodeValues(node.data.definition, node.data.values),
      portOperations: sanitizePortOperations(node.data.portOperations),
    },
    selected: false,
  };
}

function sanitizeImportedNode(node: Node<ComponentNodeData>): Node<ComponentNodeData> {
  return {
    ...node,
    id: node.id,
    type: node.type ?? "component",
    position: node.position,
    data: {
      definition: node.data.definition,
      previewEnabled: typeof node.data.previewEnabled === "boolean" ? node.data.previewEnabled : true,
      previews:
        node.data.previews && typeof node.data.previews === "object" && !Array.isArray(node.data.previews)
          ? node.data.previews
          : {},
      values: sanitizeNodeValues(node.data.definition, node.data.values),
      portOperations: sanitizePortOperations(node.data.portOperations),
    },
    selected: false,
  };
}

function sanitizeStoredEdge(edge: Edge): Edge {
  return { ...edge, selected: false };
}

function parseStoredSnapshot(rawValue: unknown): StoredGraphSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed =
      typeof rawValue === "string" ? (JSON.parse(rawValue) as StoredGraphSnapshot) : (rawValue as StoredGraphSnapshot);
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION || typeof parsed.graphId !== "string" || !parsed.graphId) {
      return null;
    }
    if (
      !parsed.flow ||
      !Array.isArray(parsed.flow.nodes) ||
      !Array.isArray(parsed.flow.edges) ||
      !parsed.scene ||
      ![2, 3].includes(parsed.scene.schemaVersion) ||
      !parsed.scene.objects
    ) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId: parsed.graphId,
      scene: normalizeSceneDocument(parsed.scene),
      flow: {
        nodes: parsed.flow.nodes.map((node) => sanitizeStoredNode(node)),
        edges: parsed.flow.edges.map((edge) => sanitizeStoredEdge(edge)),
        viewport:
          parsed.flow.viewport &&
          isFiniteNumber(parsed.flow.viewport.x) &&
          isFiniteNumber(parsed.flow.viewport.y) &&
          isFiniteNumber(parsed.flow.viewport.zoom)
            ? parsed.flow.viewport
            : DEFAULT_VIEWPORT,
      },
    };
  } catch {
    return null;
  }
}

function parseStoredGraphExport(rawValue: unknown): StoredGraphExport | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed =
      typeof rawValue === "string" ? (JSON.parse(rawValue) as StoredGraphExport) : (rawValue as StoredGraphExport);
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION || typeof parsed.graphId !== "string" || !parsed.graphId) {
      return null;
    }
    if (typeof parsed.modelUrl !== "string" || !parsed.modelUrl) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId: parsed.graphId,
      modelUrl: parsed.modelUrl,
      generatedPython: typeof parsed.generatedPython === "string" ? parsed.generatedPython : null,
      renderManifest:
        parsed.renderManifest &&
        typeof parsed.renderManifest === "object" &&
        typeof parsed.renderManifest.graphId === "string" &&
        Array.isArray(parsed.renderManifest.objects)
          ? parsed.renderManifest
          : null,
    };
  } catch {
    return null;
  }
}

function parseStoredGraphSettings(rawValue: unknown): StoredGraphSettings | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed =
      typeof rawValue === "string" ? (JSON.parse(rawValue) as StoredGraphSettings) : (rawValue as StoredGraphSettings);
    if (
      parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION ||
      typeof parsed.realtimeGenerationEnabled !== "boolean"
    ) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      autosaveEnabled: typeof parsed.autosaveEnabled === "boolean" ? parsed.autosaveEnabled : false,
      realtimeGenerationEnabled: parsed.realtimeGenerationEnabled,
    };
  } catch {
    return null;
  }
}

function parseStoredGraphSelection(rawValue: unknown): StoredGraphSelection | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed =
      typeof rawValue === "string"
        ? (JSON.parse(rawValue) as StoredGraphSelection)
        : (rawValue as StoredGraphSelection);
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION || typeof parsed.graphId !== "string" || !parsed.graphId || !Array.isArray(parsed.nodeIds)) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId: parsed.graphId,
      nodeIds: parsed.nodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string"),
    };
  } catch {
    return null;
  }
}

function buildGraphDocument(
  graphId: string,
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  viewport: GraphViewport,
  scene: SceneDocument,
): GraphDocument {
  const graphNodes: GraphNode[] = nodes.map((node) => {
    if (node.data.definition.frontend_preset === "object-reference") {
      return {
        id: node.id,
        kind: "object-reference",
        objectId: typeof node.data.values.objectId === "string" ? node.data.values.objectId : "",
        position: node.position,
        previewEnabled: node.data.previewEnabled,
        portOperations: node.data.portOperations,
      };
    }

    return {
      id: node.id,
      kind: "component",
      componentKey: node.data.definition.component_key,
      component: {
        tab: node.data.definition.tab,
        category: node.data.definition.category,
        name: node.data.definition.component,
      },
      position: node.position,
      previewEnabled: node.data.previewEnabled,
      values: sanitizeNodeValues(node.data.definition, node.data.values),
      portOperations: node.data.portOperations,
    };
  });

  const graphEdges: GraphEdge[] = edges.map((edge) => ({
    id: edge.id,
    sourceNodeId: edge.source,
    sourcePort: edge.sourceHandle ?? "",
    targetNodeId: edge.target,
    targetPort: edge.targetHandle ?? "",
  }));

  return {
    schemaVersion: 2,
    graphId,
    scene,
    viewport,
    nodes: graphNodes,
    edges: graphEdges,
  };
}

export function getInitialNodeValues(definition: PyhopperComponentDefinition): Record<string, unknown> {
  return sanitizeNodeValues(definition, {});
}

function graphDocumentPlaceholder(): GraphDocument {
  return {
    schemaVersion: 2,
    graphId: "",
    scene: createEmptySceneDocument(),
    viewport: DEFAULT_VIEWPORT,
    nodes: [],
    edges: [],
  };
}

export function GraphEditorProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const {
    isHydrated: projectsHydrated,
    projectDocuments,
    registerFlushCallback,
    registerExportingRef,
    saveProjectExport,
    saveProjectSelection,
    saveProjectSnapshot,
  } = useProjects();
  const graphId = projectId;
  const projectDocument = projectDocuments[projectId] ?? null;
  const [nodes, setNodes] = useState<Node<ComponentNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VIEWPORT);
  const [scene, setScene] = useState<SceneDocument>(createEmptySceneDocument);
  const [hasStoredSnapshot, setHasStoredSnapshot] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [generatedPython, setGeneratedPython] = useState<string | null>(null);
  const [renderManifest, setRenderManifest] = useState<RenderManifest | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [autosaveEnabled, setAutosaveEnabledState] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [realtimeGenerationEnabled, setRealtimeGenerationEnabledState] = useState(true);
  const graphDocumentRef = useRef(graphDocumentPlaceholder());
  const isExportingRef = useRef(false);
  const isHydratedRef = useRef(false);
  const nodesRef = useRef<Node<ComponentNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const viewportRef = useRef<GraphViewport>(DEFAULT_VIEWPORT);
  const sceneRef = useRef<SceneDocument>(createEmptySceneDocument());
  const exportFrameRef = useRef<number | null>(null);
  const modelUrlRef = useRef<string | null>(null);
  const generatedPythonRef = useRef<string | null>(null);
  const renderManifestRef = useRef<RenderManifest | null>(null);
  const selectedNodeIdsRef = useRef<string[]>([]);
  const persistedSnapshotRef = useRef<string>(serializeComparable(null));
  const persistedExportRef = useRef<string>(serializeComparable(null));
  const persistedSelectionRef = useRef<string>(serializeComparable(null));
  const selectedNodeIds = useMemo(() => nodes.filter((node) => node.selected).map((node) => node.id), [nodes]);

  const persistSelection = useCallback(
    (selection: StoredGraphSelection) => {
      const serializedSelection = serializeComparable(selection);
      if (serializedSelection === persistedSelectionRef.current) {
        return Promise.resolve();
      }

      if (!autosaveEnabled) {
        setHasUnsavedChanges(true);
        return Promise.resolve();
      }

      persistedSelectionRef.current = serializedSelection;
      setHasUnsavedChanges(false);
      return saveProjectSelection(graphId, selection);
    },
    [autosaveEnabled, graphId, saveProjectSelection],
  );

  const persistSnapshot = useCallback(
    (snapshot: StoredGraphSnapshot) => {
      const serializedSnapshot = serializeComparable(snapshot);
      if (serializedSnapshot === persistedSnapshotRef.current) {
        return Promise.resolve();
      }

      setHasStoredSnapshot(true);
      if (!autosaveEnabled) {
        setHasUnsavedChanges(true);
        return Promise.resolve();
      }

      persistedSnapshotRef.current = serializedSnapshot;
      setHasUnsavedChanges(false);
      return saveProjectSnapshot(graphId, snapshot);
    },
    [autosaveEnabled, graphId, saveProjectSnapshot],
  );

  const persistExport = useCallback(
    (graphExport: StoredGraphExport) => {
      const serializedExport = serializeComparable(graphExport);
      if (serializedExport === persistedExportRef.current) {
        return Promise.resolve();
      }

      if (!autosaveEnabled) {
        setHasUnsavedChanges(true);
        return Promise.resolve();
      }

      persistedExportRef.current = serializedExport;
      setHasUnsavedChanges(false);
      return saveProjectExport(graphId, graphExport);
    },
    [autosaveEnabled, graphId, saveProjectExport],
  );

  useEffect(() => {
    registerExportingRef(isExportingRef);
    return () => registerExportingRef(null);
  }, [registerExportingRef]);

  useEffect(() => {
    return () => {
      if (exportFrameRef.current !== null) {
        window.cancelAnimationFrame(exportFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!projectsHydrated || isHydrated) {
      return;
    }

    const storedSnapshot = parseStoredSnapshot(projectDocument?.snapshot ?? null);
    const storedExport = parseStoredGraphExport(projectDocument?.graphExport ?? null);
    const storedSettings = parseStoredGraphSettings(window.localStorage.getItem(GRAPH_SETTINGS_STORAGE_KEY));
    const storedSelection = parseStoredGraphSelection(projectDocument?.selection ?? null);

    if (storedSnapshot) {
      const selectedIds = storedSelection?.graphId === storedSnapshot.graphId ? storedSelection.nodeIds : [];
      setNodes(storedSnapshot.flow.nodes.map((node) => ({ ...node, selected: selectedIds.includes(node.id) })));
      setEdges(storedSnapshot.flow.edges);
      setViewport(storedSnapshot.flow.viewport);
      setScene(storedSnapshot.scene);
      setHasStoredSnapshot(true);
    }

    if (storedExport) {
      setModelUrl(storedExport.modelUrl);
      setGeneratedPython(storedExport.generatedPython);
      setRenderManifest(storedExport.renderManifest);
    }

    if (storedSettings) {
      setAutosaveEnabledState(storedSettings.autosaveEnabled);
      setRealtimeGenerationEnabledState(storedSettings.realtimeGenerationEnabled);
    }

    persistedSnapshotRef.current = serializeComparable(storedSnapshot);
    persistedExportRef.current = serializeComparable(storedExport);
    persistedSelectionRef.current = serializeComparable(storedSelection);
    setHasUnsavedChanges(false);

    setIsHydrated(true);
  }, [graphId, isHydrated, projectDocument, projectsHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void persistSelection({
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId,
      nodeIds: selectedNodeIds,
    });
  }, [graphId, isHydrated, persistSelection, selectedNodeIds]);

  const setNodeValue = useCallback((nodeId: string, valueKey: string, value: unknown) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            values: {
              ...node.data.values,
              [valueKey]: value,
            },
          },
        };
      }),
    );
  }, []);

  const addObjectReferenceNode = useCallback((objectId: string) => {
    setNodes((currentNodes) => [
      ...currentNodes.map((node) => ({ ...node, selected: false })),
      {
        id: `object-reference-${crypto.randomUUID()}`,
        type: "component",
        position: {
          x: (-viewportRef.current.x + 140) / viewportRef.current.zoom,
          y: (-viewportRef.current.y + 140) / viewportRef.current.zoom,
        },
        selected: true,
        data: {
          definition: OBJECT_REFERENCE_DEFINITION,
          previewEnabled: true,
          previews: {},
          values: { objectId },
          portOperations: {},
        },
      },
    ]);
  }, []);

  const deleteSceneObjects = useCallback((objectIds: string[]) => {
    const requestedIds = new Set(objectIds);
    const deletableIds = new Set(
      Object.values(sceneRef.current.objects)
        .filter((object) => requestedIds.has(object.id) && !object.metadata.locked)
        .map((object) => object.id),
    );
    if (!deletableIds.size) return;

    const referenceNodeIds = new Set(
      nodesRef.current
        .filter(
          (node) =>
            node.data.definition.frontend_preset === "object-reference" &&
            typeof node.data.values.objectId === "string" &&
            deletableIds.has(node.data.values.objectId),
        )
        .map((node) => node.id),
    );

    setScene((currentScene) => ({
      ...currentScene,
      objects: Object.fromEntries(
        Object.entries(currentScene.objects).filter(([objectId]) => !deletableIds.has(objectId)),
      ),
    }));
    if (referenceNodeIds.size) {
      setNodes((currentNodes) => currentNodes.filter((node) => !referenceNodeIds.has(node.id)));
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) => !referenceNodeIds.has(edge.source) && !referenceNodeIds.has(edge.target),
        ),
      );
    }
  }, []);

  const setPortOperation = useCallback((nodeId: string, portKind: "input" | "output", portName: string, operation: PortOperation) => {
    const key = `${portKind}:${portName}`;
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }
        const current = node.data.portOperations[key];
        const nextOperations = { ...node.data.portOperations };
        if (current === operation) {
          delete nextOperations[key];
        } else {
          nextOperations[key] = operation;
        }
        return {
          ...node,
          data: { ...node.data, portOperations: nextOperations },
        };
      }),
    );
  }, []);

  const setNodePreviewEnabled = useCallback((nodeId: string, enabled: boolean) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            previewEnabled: enabled,
          },
        };
      }),
    );
  }, []);

  const saveGraphSnapshot = useCallback((flow: {
    nodes: Node<ComponentNodeData>[];
    edges: Edge[];
    viewport: GraphViewport;
  }) => {
    void persistSnapshot(createStoredGraphSnapshot(graphId, flow, sceneRef.current));
  }, [graphId, persistSnapshot]);

  const graphDocument = useMemo(
    () => buildGraphDocument(graphId, nodes, edges, viewport, scene),
    [edges, graphId, nodes, scene, viewport],
  );

  graphDocumentRef.current = graphDocument;
  isExportingRef.current = isExporting;
  isHydratedRef.current = isHydrated;
  nodesRef.current = nodes;
  edgesRef.current = edges;
  viewportRef.current = viewport;
  sceneRef.current = scene;
  modelUrlRef.current = modelUrl;
  generatedPythonRef.current = generatedPython;
  renderManifestRef.current = renderManifest;
  selectedNodeIdsRef.current = selectedNodeIds;

  useEffect(() => {
    registerFlushCallback(() => {
      if (!autosaveEnabled) {
        return;
      }

      void persistSnapshot(
        createStoredGraphSnapshot(graphId, {
          nodes: nodesRef.current,
          edges: edgesRef.current,
          viewport: viewportRef.current,
        }, sceneRef.current),
      );
    });
    return () => registerFlushCallback(null);
  }, [autosaveEnabled, graphId, persistSnapshot, registerFlushCallback]);

  const exportGraph = useCallback(async () => {
    if (isExportingRef.current) {
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      const currentGraphDocument = graphDocumentRef.current;
      const response = await fetch(`${apiBaseUrl}/graphs/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentGraphDocument),
      });

      const payload = (await response.json()) as
        | GraphExportResponse
        | { error?: { message?: string }; errors?: Array<{ message?: string }> };

      if (!response.ok) {
        const errors = "errors" in payload && Array.isArray(payload.errors) ? payload.errors : [];
        const message =
          errors[0]?.message ??
          ("error" in payload && payload.error?.message ? payload.error.message : "Graph export failed");
        throw new Error(message);
      }

      if (!("glb_url" in payload) || typeof payload.glb_url !== "string") {
        throw new Error("Graph export did not return a GLB URL");
      }

      setModelUrl(payload.glb_url);
      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            previews:
              "node_previews" in payload &&
              payload.node_previews &&
              typeof payload.node_previews === "object" &&
              payload.node_previews[node.id]
                ? {
                    [node.data.definition.outputs[0]?.name ?? "value"]: payload.node_previews[node.id],
                  }
                : {},
          },
        })),
      );
      setGeneratedPython("python_source" in payload ? payload.python_source : null);
      setRenderManifest("render_manifest" in payload ? payload.render_manifest : null);
      void persistExport({
        schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
        graphId: currentGraphDocument.graphId,
        modelUrl: payload.glb_url,
        generatedPython: "python_source" in payload ? payload.python_source : null,
        renderManifest: "render_manifest" in payload ? payload.render_manifest : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Graph export failed";
      setExportError(message);
      console.error("Failed to export graph", error);
    } finally {
      setIsExporting(false);
    }
  }, [persistExport]);

  const requestRealtimeGeneration = useCallback(() => {
    if (!realtimeGenerationEnabled || !isHydratedRef.current || isExportingRef.current || !nodesRef.current.length) {
      return;
    }

    if (exportFrameRef.current !== null) {
      window.cancelAnimationFrame(exportFrameRef.current);
    }

    exportFrameRef.current = window.requestAnimationFrame(() => {
      exportFrameRef.current = null;

      if (!realtimeGenerationEnabled || !isHydratedRef.current || isExportingRef.current || !nodesRef.current.length) {
        return;
      }

      void exportGraph();
    });
  }, [exportGraph, realtimeGenerationEnabled]);

  useEffect(() => {
    if (!isHydrated) return;
    void persistSnapshot(
      createStoredGraphSnapshot(
        graphId,
        {
          nodes: nodesRef.current,
          edges: edgesRef.current,
          viewport: viewportRef.current,
        },
        scene,
      ),
    );
    requestRealtimeGeneration();
  }, [graphId, isHydrated, persistSnapshot, requestRealtimeGeneration, scene]);

  const saveCurrentDefinition = useCallback(async () => {
    if (!isHydratedRef.current) {
      return;
    }

    const snapshot = createStoredGraphSnapshot(graphId, {
      nodes: nodesRef.current,
      edges: edgesRef.current,
      viewport: viewportRef.current,
    }, sceneRef.current);
    const selection: StoredGraphSelection = {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId,
      nodeIds: selectedNodeIdsRef.current,
    };
    const graphExport =
      modelUrlRef.current
        ? {
            schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
            graphId,
            modelUrl: modelUrlRef.current,
            generatedPython: generatedPythonRef.current,
            renderManifest: renderManifestRef.current,
          }
        : null;

    setIsSaving(true);
    try {
      await Promise.all([
        saveProjectSnapshot(graphId, snapshot),
        saveProjectSelection(graphId, selection),
        graphExport ? saveProjectExport(graphId, graphExport) : Promise.resolve(),
      ]);
      persistedSnapshotRef.current = serializeComparable(snapshot);
      persistedSelectionRef.current = serializeComparable(selection);
      if (graphExport) {
        persistedExportRef.current = serializeComparable(graphExport);
      }
      setHasUnsavedChanges(false);
      setHasStoredSnapshot(true);
    } finally {
      setIsSaving(false);
    }
  }, [graphId, saveProjectExport, saveProjectSelection, saveProjectSnapshot]);

  const setRealtimeGenerationEnabled = useCallback((enabled: boolean) => {
    setRealtimeGenerationEnabledState(enabled);
    persistGraphSettings({
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      autosaveEnabled,
      realtimeGenerationEnabled: enabled,
    });
  }, [autosaveEnabled]);

  const setAutosaveEnabled = useCallback((enabled: boolean) => {
    setAutosaveEnabledState(enabled);
    persistGraphSettings({
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      autosaveEnabled: enabled,
      realtimeGenerationEnabled,
    });

    if (enabled) {
      void saveCurrentDefinition();
    }
  }, [realtimeGenerationEnabled, saveCurrentDefinition]);

  const importGraph = useCallback((payload: GraphImportResponse) => {
    const sanitizedNodes = payload.flow.nodes.map((node) => sanitizeImportedNode(node as Node<ComponentNodeData>));
    const sanitizedEdges = payload.flow.edges.map((edge) => sanitizeStoredEdge(edge as Edge));
    const nextViewport =
      payload.flow.viewport &&
      isFiniteNumber(payload.flow.viewport.x) &&
      isFiniteNumber(payload.flow.viewport.y) &&
      isFiniteNumber(payload.flow.viewport.zoom)
        ? payload.flow.viewport
        : DEFAULT_VIEWPORT;

    setNodes(sanitizedNodes);
    setEdges(sanitizedEdges);
    setViewport(nextViewport);
    setScene(createEmptySceneDocument());
    setHasStoredSnapshot(true);
    setModelUrl(payload.glb_url);
    setGeneratedPython(payload.python_source);
    setRenderManifest(payload.render_manifest);
    setExportError(null);

    void persistSnapshot(createStoredGraphSnapshot(graphId, {
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      viewport: nextViewport,
    }, createEmptySceneDocument()));
    void persistExport({
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId,
      modelUrl: payload.glb_url,
      generatedPython: payload.python_source,
      renderManifest: payload.render_manifest,
    });
  }, [graphId, persistExport, persistSnapshot]);

  const value = useMemo<GraphEditorContextValue>(
    () => ({
      addObjectReferenceNode,
      deleteSceneObjects,
      edges,
      exportError,
      exportGraph,
      autosaveEnabled,
      generatedPython,
      graphDocument,
      graphId,
      hasStoredSnapshot,
      hasUnsavedChanges,
      importGraph,
      isExporting,
      isHydrated,
      isSaving,
      modelUrl,
      nodes,
      realtimeGenerationEnabled,
      renderManifest,
      scene,
      requestRealtimeGeneration,
      saveCurrentDefinition,
      saveGraphSnapshot,
      selectedNodeIds,
      setAutosaveEnabled,
      setEdges,
      setNodes,
      setScene,
      setNodePreviewEnabled,
      setNodeValue,
      setPortOperation,
      setRealtimeGenerationEnabled,
      setViewport,
      viewport,
    }),
    [
      addObjectReferenceNode,
      deleteSceneObjects,
      edges,
      exportError,
      exportGraph,
      autosaveEnabled,
      generatedPython,
      graphDocument,
      graphId,
      hasStoredSnapshot,
      hasUnsavedChanges,
      importGraph,
      isExporting,
      isHydrated,
      isSaving,
      modelUrl,
      nodes,
      realtimeGenerationEnabled,
      renderManifest,
      scene,
      requestRealtimeGeneration,
      saveCurrentDefinition,
      saveGraphSnapshot,
      selectedNodeIds,
      setAutosaveEnabled,
      setNodePreviewEnabled,
      setNodeValue,
      setPortOperation,
      setRealtimeGenerationEnabled,
      viewport,
    ],
  );

  return <GraphEditorContext.Provider value={value}>{children}</GraphEditorContext.Provider>;
}

export function useGraphEditor() {
  const context = useContext(GraphEditorContext);
  if (!context) {
    throw new Error("useGraphEditor must be used within a GraphEditorProvider");
  }
  return context;
}

export function persistGraphSettings(snapshot: StoredGraphSettings) {
  window.localStorage.setItem(GRAPH_SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function createStoredGraphSnapshot(
  graphId: string,
  flow: {
    nodes: Node<ComponentNodeData>[];
    edges: Edge[];
    viewport: GraphViewport;
  },
  scene: SceneDocument,
): StoredGraphSnapshot {
  return {
    schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
    graphId,
    scene,
    flow: {
      nodes: flow.nodes.map((node) => sanitizeStoredNode(node)),
      edges: flow.edges.map((edge) => sanitizeStoredEdge(edge)),
      viewport: flow.viewport,
    },
  };
}
