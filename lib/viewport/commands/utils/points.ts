import type { Vector3Tuple } from "three";

export function copyPoint(point: Vector3Tuple): Vector3Tuple {
  return [point[0], point[1], point[2]];
}

export function appendPoint(points: Vector3Tuple[], point: Vector3Tuple): Vector3Tuple[] {
  return [...points, copyPoint(point)];
}
