import type { Vector3Tuple } from "three";

import { viewportPointAtom } from "@/lib/scene/scene";
import type { SerializedAtom } from "@/lib/scene/types";
import type { ViewportCommandState } from "../types";

export function previewPoints(commandState: ViewportCommandState, point: Vector3Tuple): Vector3Tuple[] {
  return [...commandState.draftPoints, point];
}

export function stagedPreviewAtom(
  commandState: ViewportCommandState,
  point: Vector3Tuple,
  requiredPoints: number,
  complete: (points: Vector3Tuple[]) => SerializedAtom,
): SerializedAtom {
  const points = previewPoints(commandState, point);
  if (points.length >= requiredPoints) return complete(points);
  if (points.length === 1) return viewportPointAtom(points[0]);
  return { type: "Polyline", points: points.map(viewportPointAtom) };
}
