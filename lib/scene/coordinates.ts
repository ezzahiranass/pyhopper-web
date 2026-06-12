import type { Vector3Tuple } from "three";

// Generated Pyhopper GLBs are displayed with a -90 degree X rotation.
export function pyhopperToViewport(point: Vector3Tuple): Vector3Tuple {
  return [point[0], point[2], -point[1]];
}

export function viewportToPyhopper(point: Vector3Tuple): Vector3Tuple {
  return [point[0], -point[2], point[1]];
}
