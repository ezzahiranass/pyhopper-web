import { addAtomObject } from "@/lib/scene/scene";
import type { ViewportCommand } from "./types";
import { circleAtom } from "./utils/geometry";
import { cancelStagedCommand, stageFixedPointCommand } from "./utils/stagedPoints";
import { stagedPreviewAtom } from "./utils/preview";

export const circleCommand: ViewportCommand = {
  id: "circle",
  label: "Draw Circle",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) =>
    stagedPreviewAtom(commandState, point, 2, (points) => circleAtom(points[0], points[1])),
  onPoint: (commandState, scene, point) =>
    stageFixedPointCommand(commandState, scene, point, 2, (currentScene, points) =>
      addAtomObject(currentScene, "circle", "Circle", circleAtom(points[0], points[1])),
    ),
  onCancel: cancelStagedCommand,
};
