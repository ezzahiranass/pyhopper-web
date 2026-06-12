import type { Vector3Tuple } from "three";

import type { SceneDocument, SceneObject, SerializedAtom } from "./types";
import { pyhopperToViewport, viewportToPyhopper } from "./coordinates";
import { atomCurvePoints } from "./curves";
import { createSceneObjectTransform } from "./transforms";

export function createEmptySceneDocument(): SceneDocument {
  return { schemaVersion: 3, objects: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function canonicalAtom(atom: SerializedAtom, command: string): SerializedAtom {
  if (command === "curve" && Array.isArray(atom.construction_points)) {
    return { type: "InterpolatedCurve", points: atom.construction_points, degree: 3 };
  }
  if (atom.type === "NurbsCurve") {
    return {
      type: atom.type,
      control_points: atom.control_points,
      weights: atom.weights,
      knots: atom.knots,
      degree: atom.degree,
    };
  }
  if (atom.type === "Circle") return { type: atom.type, plane: atom.plane, radius: atom.radius };
  if (atom.type === "Arc") return { type: atom.type, plane: atom.plane, radius: atom.radius, angle: atom.angle };
  if (atom.type === "Polyline") return { type: atom.type, points: atom.points };
  return atom;
}

export function normalizeSceneDocument(value: unknown): SceneDocument {
  if (!isRecord(value) || !isRecord(value.objects)) return createEmptySceneDocument();
  const objects = Object.fromEntries(
    Object.entries(value.objects).flatMap(([id, rawObject]) => {
      if (!isRecord(rawObject) || !isRecord(rawObject.metadata) || !isRecord(rawObject.transform)) return [];
      const branches = isRecord(rawObject.tree) && Array.isArray(rawObject.tree.branches)
        ? rawObject.tree.branches
        : null;
      const firstBranch = branches && isRecord(branches[0]) && Array.isArray(branches[0].items)
        ? branches[0]
        : null;
      const legacyItems = firstBranch && Array.isArray(firstBranch.items) ? firstBranch.items : null;
      const rawAtom = isRecord(rawObject.atom)
        ? rawObject.atom
        : legacyItems && isRecord(legacyItems[0])
          ? legacyItems[0]
          : null;
      if (!rawAtom || typeof rawAtom.type !== "string") return [];
      const command =
        typeof rawObject.metadata.createdByCommand === "string"
          ? rawObject.metadata.createdByCommand
          : "unknown";
      return [[id, {
        id,
        metadata: rawObject.metadata,
        name: typeof rawObject.name === "string" ? rawObject.name : "Object",
        revision: typeof rawObject.revision === "number" ? rawObject.revision : 1,
        transform: rawObject.transform,
        atom: canonicalAtom(rawAtom as SerializedAtom, command),
      } as SceneObject]];
    }),
  );
  return { schemaVersion: 3, objects };
}

export function viewportPointAtom(point: Vector3Tuple): SerializedAtom {
  const [x, y, z] = viewportToPyhopper(point);
  return { type: "Point3d", x, y, z };
}

function nextDefaultName(scene: SceneDocument, prefix: string): string {
  const count = Object.values(scene.objects).filter((object) => object.name.startsWith(prefix)).length;
  return `${prefix} ${String(count + 1).padStart(2, "0")}`;
}

function createSceneObject(
  scene: SceneDocument,
  command: string,
  namePrefix: string,
  atom: SerializedAtom,
): SceneObject {
  const points = atomViewportPoints(atom);
  const pivot: Vector3Tuple = points.length
    ? ([0, 1, 2].map((axis) => {
        const coordinates = points.map((point) => point[axis]);
        return (Math.min(...coordinates) + Math.max(...coordinates)) / 2;
      }) as Vector3Tuple)
    : [0, 0, 0];
  return {
    id: crypto.randomUUID(),
    metadata: {
      createdByCommand: command,
      locked: false,
      tags: [],
      visible: true,
    },
    name: nextDefaultName(scene, namePrefix),
    revision: 1,
    transform: createSceneObjectTransform(pivot),
    atom,
  };
}

export function addAtomObject(
  scene: SceneDocument,
  command: string,
  namePrefix: string,
  atom: SerializedAtom,
): SceneDocument {
  const object = createSceneObject(scene, command, namePrefix, atom);
  return { ...scene, objects: { ...scene.objects, [object.id]: object } };
}

export function addPointObject(scene: SceneDocument, point: Vector3Tuple): SceneDocument {
  return addAtomObject(scene, "point", "Point", viewportPointAtom(point));
}

export function addPolylineObject(scene: SceneDocument, points: Vector3Tuple[]): SceneDocument {
  const object = createSceneObject(scene, "polyline", "Polyline", {
    type: "Polyline",
    points: points.map(viewportPointAtom),
  });
  return { ...scene, objects: { ...scene.objects, [object.id]: object } };
}

export function atomPoint(atom: SerializedAtom): Vector3Tuple | null {
  if (
    atom.type !== "Point3d" ||
    typeof atom.x !== "number" ||
    typeof atom.y !== "number" ||
    typeof atom.z !== "number"
  ) {
    return null;
  }
  return pyhopperToViewport([atom.x, atom.y, atom.z]);
}

export function atomPolyline(atom: SerializedAtom): Vector3Tuple[] | null {
  if (atom.type !== "Polyline" || !Array.isArray(atom.points)) return null;
  const points = atom.points.map((point) => atomPoint(point as SerializedAtom));
  return points.every((point): point is Vector3Tuple => point !== null) ? points : null;
}

export function sceneObjectAtoms(object: SceneObject): SerializedAtom[] {
  return [object.atom];
}

export function atomViewportPoints(atom: SerializedAtom): Vector3Tuple[] {
  const point = atomPoint(atom);
  if (point) return [point];
  return atomPolyline(atom) ?? atomCurvePoints(atom) ?? [];
}
