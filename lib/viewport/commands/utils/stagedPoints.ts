import type { Vector3Tuple } from "three";

import type { SceneDocument } from "@/lib/scene/types";
import type {
  ViewportCommandResult,
  ViewportCommandState,
} from "@/lib/viewport/commands/types";
import { appendPoint } from "./points";

export function clearDraftPoints(commandState: ViewportCommandState): ViewportCommandState {
  return { ...commandState, draftPoints: [], hoverPoint: null };
}

export function appendDraftPoint(
  commandState: ViewportCommandState,
  point: Vector3Tuple,
): ViewportCommandState {
  return {
    ...commandState,
    draftPoints: appendPoint(commandState.draftPoints, point),
  };
}

export function cancelStagedCommand(
  commandState: ViewportCommandState,
  scene: SceneDocument,
): ViewportCommandResult {
  return { commandState: clearDraftPoints(commandState), scene };
}

export function stageFixedPointCommand(
  commandState: ViewportCommandState,
  scene: SceneDocument,
  point: Vector3Tuple,
  requiredPoints: number,
  complete: (scene: SceneDocument, points: Vector3Tuple[]) => SceneDocument,
): ViewportCommandResult {
  const nextCommandState = appendDraftPoint(commandState, point);
  if (nextCommandState.draftPoints.length < requiredPoints) {
    return { commandState: nextCommandState, scene };
  }

  return {
    commandState: clearDraftPoints(nextCommandState),
    completed: true,
    scene: complete(scene, nextCommandState.draftPoints),
  };
}
