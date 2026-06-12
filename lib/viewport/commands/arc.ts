import { addAtomObject } from "@/lib/scene/scene";
import type { ViewportCommand } from "./types";
import { arcAtom } from "./utils/geometry";
import { cancelStagedCommand, stageFixedPointCommand } from "./utils/stagedPoints";
import { stagedPreviewAtom } from "./utils/preview";

export const arcCommand: ViewportCommand = {
  id: "arc",
  label: "Draw Arc",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (commandState, point) =>
    stagedPreviewAtom(commandState, point, 3, (points) => arcAtom(points[0], points[1], points[2])),
  onPoint: (commandState, scene, point) =>
    stageFixedPointCommand(commandState, scene, point, 3, (currentScene, points) =>
      addAtomObject(currentScene, "arc", "Arc", arcAtom(points[0], points[1], points[2])),
    ),
  onCancel: cancelStagedCommand,
};
