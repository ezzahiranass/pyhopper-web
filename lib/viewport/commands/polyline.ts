import type { ViewportCommand } from "./types";
import { addPolylineObject, viewportPointAtom } from "@/lib/scene/scene";
import { appendDraftPoint, cancelStagedCommand, clearDraftPoints } from "./utils/stagedPoints";
import { previewPoints } from "./utils/preview";

export const polylineCommand: ViewportCommand = {
  id: "polyline",
  label: "Draw Polyline",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) => ({
    type: "Polyline",
    points: previewPoints(commandState, point).map(viewportPointAtom),
  }),
  onPoint: (commandState, scene, point) => ({
    commandState: appendDraftPoint(commandState, point),
    scene,
  }),
  onComplete: (commandState, scene) => {
    if (commandState.draftPoints.length < 2) {
      return { commandState: clearDraftPoints(commandState), scene };
    }

    return {
      commandState: clearDraftPoints(commandState),
      scene: addPolylineObject(scene, commandState.draftPoints),
    };
  },
  onCancel: cancelStagedCommand,
};
