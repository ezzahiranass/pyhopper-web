import { addAtomObject } from "@/lib/scene/scene";
import type { ViewportCommand } from "./types";
import { ellipseAtom } from "./utils/geometry";
import { cancelStagedCommand, stageFixedPointCommand } from "./utils/stagedPoints";
import { stagedPreviewAtom } from "./utils/preview";

export const ellipseCommand: ViewportCommand = {
  id: "ellipse",
  label: "Draw Ellipse",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) =>
    stagedPreviewAtom(commandState, point, 3, (points) => ellipseAtom(points[0], points[1], points[2])),
  onPoint: (commandState, scene, point) =>
    stageFixedPointCommand(commandState, scene, point, 3, (currentScene, points) =>
      addAtomObject(currentScene, "ellipse", "Ellipse", ellipseAtom(points[0], points[1], points[2])),
    ),
  onCancel: cancelStagedCommand,
};
