import { Euler, Matrix4, Quaternion, Vector3, type Vector3Tuple } from "three";

import { atomCurveControlPoints } from "./curves";
import { atomPolyline, atomViewportPoints, sceneObjectAtoms, viewportPointAtom } from "./scene";
import type { SceneObject, SerializedAtom } from "./types";
import {
  arcAtom,
  circleAtom,
  controlPointCurveAtom,
  ellipseAtom,
  interpolatedCurveAtom,
  rectangleAtom,
} from "@/lib/viewport/commands/utils/geometry";

export type EditablePoint = {
  atomIndex: number;
  key: string;
  pointIndex: number;
  position: Vector3Tuple;
};

export function editableObjectPoints(object: SceneObject): EditablePoint[] {
  const points = atomCurveControlPoints(object.atom) ?? atomPolyline(object.atom) ?? [];
  return points.map((position, pointIndex) => ({
    atomIndex: 0,
    key: `0:${pointIndex}`,
    pointIndex,
    position,
  }));
}

export function pointsBoundsCenter(points: Vector3Tuple[]): Vector3Tuple | null {
  if (!points.length) return null;
  return [0, 1, 2].map((axis) => {
    const coordinates = points.map((point) => point[axis]);
    return (Math.min(...coordinates) + Math.max(...coordinates)) / 2;
  }) as Vector3Tuple;
}

export function objectGeometryWorldCenter(object: SceneObject): Vector3Tuple {
  const center =
    pointsBoundsCenter(sceneObjectAtoms(object).flatMap((atom) => atomViewportPoints(atom))) ??
    object.transform.pivot;
  return objectLocalPointToWorld(object, center);
}

function rebuildAtom(
  atom: SerializedAtom,
  command: string,
  selectedKeys: Set<string>,
  atomIndex: number,
  transformPoint: (point: Vector3Tuple) => Vector3Tuple,
): SerializedAtom {
  const points = atomCurveControlPoints(atom) ?? atomPolyline(atom);
  if (!points) return atom;
  const nextPoints = points.map((point, pointIndex) =>
    selectedKeys.has(`${atomIndex}:${pointIndex}`) ? transformPoint(point) : point,
  );

  if (command === "circle" && nextPoints.length >= 2) return circleAtom(nextPoints[0], nextPoints[1]);
  if (command === "arc" && nextPoints.length >= 3) return arcAtom(nextPoints[0], nextPoints[1], nextPoints[2]);
  if (command === "ellipse" && nextPoints.length >= 3) return ellipseAtom(nextPoints[0], nextPoints[1], nextPoints[2]);
  if (command === "rectangle" && nextPoints.length >= 2) return rectangleAtom(nextPoints[0], nextPoints[1]);
  if (command === "curve") return interpolatedCurveAtom(nextPoints);
  if (command === "control-curve") return controlPointCurveAtom(nextPoints);
  if (atom.type === "Polyline") {
    return { ...atom, points: nextPoints.map(viewportPointAtom) };
  }
  if (atom.type === "NurbsCurve") {
    return {
      ...atom,
      control_points: nextPoints.map(viewportPointAtom),
    };
  }
  return atom;
}

function mapObjectPoints(
  object: SceneObject,
  pointKeys: string[],
  transformPoint: (point: Vector3Tuple) => Vector3Tuple,
): SceneObject {
  const selectedKeys = new Set(pointKeys);
  return {
    ...object,
    revision: object.revision + 1,
    atom: rebuildAtom(object.atom, object.metadata.createdByCommand, selectedKeys, 0, transformPoint),
  };
}

export function objectLocalPointToWorld(object: SceneObject, point: Vector3Tuple): Vector3Tuple {
  return new Vector3(
    point[0] - object.transform.pivot[0],
    point[1] - object.transform.pivot[1],
    point[2] - object.transform.pivot[2],
  ).applyMatrix4(objectWorldMatrix(object)).toArray();
}

export function objectWorldMatrix(object: SceneObject): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...object.transform.position),
    new Quaternion().setFromEuler(new Euler(...object.transform.rotation)),
    new Vector3(...object.transform.scale),
  );
}

export function objectTransformAfterWorldDelta(
  object: SceneObject,
  worldDelta: Matrix4,
): { position: Vector3Tuple; rotation: Vector3Tuple; scale: Vector3Tuple } {
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  worldDelta.clone().multiply(objectWorldMatrix(object)).decompose(position, rotation, scale);
  const euler = new Euler().setFromQuaternion(rotation);
  return {
    position: position.toArray(),
    rotation: [euler.x, euler.y, euler.z],
    scale: scale.toArray(),
  };
}

function objectWorldPointToLocal(object: SceneObject, point: Vector3Tuple): Vector3Tuple {
  const local = new Vector3(...point).applyMatrix4(objectWorldMatrix(object).invert());
  return [
    local.x + object.transform.pivot[0],
    local.y + object.transform.pivot[1],
    local.z + object.transform.pivot[2],
  ];
}

export function transformObjectPoints(
  object: SceneObject,
  pointKeys: string[],
  worldDelta: Matrix4,
): SceneObject {
  return mapObjectPoints(object, pointKeys, (point) =>
    objectWorldPointToLocal(
      object,
      new Vector3(...objectLocalPointToWorld(object, point)).applyMatrix4(worldDelta).toArray(),
    ),
  );
}
