import type { Vector3Tuple } from "three";
import type { SceneDocument, SerializedAtom } from "@/lib/scene/types";

export type ViewportCommandId =
  | "select"
  | "point"
  | "polyline"
  | "curve"
  | "control-curve"
  | "circle"
  | "arc"
  | "ellipse"
  | "rectangle";

export type ViewportCommandSection = "select" | "geometry";

export type ViewportCommandState = {
  draftPoints: Vector3Tuple[];
  hoverPoint: Vector3Tuple | null;
};

export type ViewportCommandResult = {
  commandState: ViewportCommandState;
  completed?: boolean;
  scene: SceneDocument;
};

export type ViewportCommand = {
  id: ViewportCommandId;
  label: string;
  cursor: string;
  section: ViewportCommandSection;
  previewAtom?: (commandState: ViewportCommandState, point: Vector3Tuple) => SerializedAtom;
  onCancel?: (commandState: ViewportCommandState, scene: SceneDocument) => ViewportCommandResult;
  onComplete?: (commandState: ViewportCommandState, scene: SceneDocument) => ViewportCommandResult;
  onPoint?: (
    commandState: ViewportCommandState,
    scene: SceneDocument,
    point: Vector3Tuple,
  ) => ViewportCommandResult;
};
