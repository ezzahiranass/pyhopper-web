import { addAtomObject } from "@/lib/scene/scene";
import type { ViewportCommand } from "./types";
import { interpolatedCurveAtom } from "./utils/geometry";
import { appendDraftPoint, cancelStagedCommand, clearDraftPoints } from "./utils/stagedPoints";
import { stagedPreviewAtom } from "./utils/preview";

export const curveCommand: ViewportCommand = {
  id: "curve",
  label: "Draw Interpolated Curve",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) =>
    stagedPreviewAtom(commandState, point, 2, interpolatedCurveAtom),
  onPoint: (commandState, scene, point) => ({
    commandState: appendDraftPoint(commandState, point),
    scene,
  }),
  onComplete: (commandState, scene) => ({
    commandState: clearDraftPoints(commandState),
    scene:
      commandState.draftPoints.length >= 2
        ? addAtomObject(scene, "curve", "Curve", interpolatedCurveAtom(commandState.draftPoints))
        : scene,
  }),
  onCancel: cancelStagedCommand,
};
