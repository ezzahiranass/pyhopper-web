import { addAtomObject } from "@/lib/scene/scene";
import type { ViewportCommand } from "./types";
import { controlPointCurveAtom } from "./utils/geometry";
import { appendDraftPoint, cancelStagedCommand, clearDraftPoints } from "./utils/stagedPoints";
import { stagedPreviewAtom } from "./utils/preview";

export const controlCurveCommand: ViewportCommand = {
  id: "control-curve",
  label: "Draw Control Point Curve",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) =>
    stagedPreviewAtom(commandState, point, 2, controlPointCurveAtom),
  onPoint: (commandState, scene, point) => ({
    commandState: appendDraftPoint(commandState, point),
    scene,
  }),
  onComplete: (commandState, scene) => ({
    commandState: clearDraftPoints(commandState),
    scene:
      commandState.draftPoints.length >= 2
        ? addAtomObject(
            scene,
            "control-curve",
            "Control Curve",
            controlPointCurveAtom(commandState.draftPoints),
          )
        : scene,
  }),
  onCancel: cancelStagedCommand,
};
