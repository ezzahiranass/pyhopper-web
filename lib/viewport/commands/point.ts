import type { ViewportCommand } from "./types";
import { addPointObject, viewportPointAtom } from "@/lib/scene/scene";

export const pointCommand: ViewportCommand = {
  id: "point",
  label: "Add Point",
  cursor: "crosshair",
  section: "geometry",
  previewAtom: (_commandState, point) => viewportPointAtom(point),
  onPoint: (commandState, scene, point) => ({
    commandState,
    scene: addPointObject(scene, point),
  }),
};
