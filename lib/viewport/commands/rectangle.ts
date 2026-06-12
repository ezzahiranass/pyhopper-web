import { addAtomObject } from "@/lib/scene/scene";
import type { ViewportCommand } from "./types";
import { rectangleAtom } from "./utils/geometry";
import { cancelStagedCommand, stageFixedPointCommand } from "./utils/stagedPoints";
import { stagedPreviewAtom } from "./utils/preview";

export const rectangleCommand: ViewportCommand = {
  id: "rectangle",
  label: "Draw Rectangle",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) =>
    stagedPreviewAtom(commandState, point, 2, (points) => rectangleAtom(points[0], points[1])),
  onPoint: (commandState, scene, point) =>
    stageFixedPointCommand(commandState, scene, point, 2, (currentScene, points) =>
      addAtomObject(currentScene, "rectangle", "Rectangle", rectangleAtom(points[0], points[1])),
    ),
  onCancel: cancelStagedCommand,
};
