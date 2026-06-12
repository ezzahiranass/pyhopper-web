import type { ThreeEvent } from "@react-three/fiber";
import type { MutableRefObject } from "react";
import type { Matrix4, Vector3Tuple } from "three";

import { ViewportAtomGeometry } from "@/components/molecules/ViewportAtomGeometry";
import { ViewportSceneObject } from "@/components/organisms/ViewportSceneObject";
import type { TransformMode } from "@/components/providers/ViewportToolProvider";
import type { ViewportMode } from "@/components/providers/ViewportToolProvider";
import type { SceneDocument } from "@/lib/scene/types";
import { getViewportCommand } from "@/lib/viewport/commands/registry";
import type { ViewportCommandId, ViewportCommandState } from "@/lib/viewport/commands/types";

type ViewportCommandGeometryProps = {
  activeTool: ViewportCommandId;
  color: string;
  draftColor: string;
  editColor: string;
  hoverColor: string;
  commandState: ViewportCommandState;
  scene: SceneDocument;
  selectedObjectId: string | null;
  interactive: boolean;
  onCommitTransform: (
    objectId: string,
    position: Vector3Tuple,
    rotation: Vector3Tuple,
    scale: Vector3Tuple,
  ) => void;
  onSelectObject: (id: string) => void;
  onObjectContextMenu: (id: string, event: ThreeEvent<MouseEvent>) => void;
  onTransformEnd: () => void;
  onTransformStart: () => void;
  transformActive: boolean;
  transformActiveRef: MutableRefObject<boolean>;
  transformMode: TransformMode;
  mode: ViewportMode;
  selectedObjectIds: string[];
  selectedPointKeys: string[];
  onSelectPoint: (key: string) => void;
  onCommitPointTransform: (objectId: string, pointKeys: string[], worldDelta: Matrix4) => void;
};

export function ViewportCommandGeometry({
  activeTool,
  color,
  commandState,
  draftColor,
  editColor,
  hoverColor,
  interactive,
  onCommitTransform,
  onObjectContextMenu,
  onSelectObject,
  onTransformEnd,
  onTransformStart,
  scene,
  selectedObjectId,
  transformActiveRef,
  transformMode,
  mode,
  selectedObjectIds,
  selectedPointKeys,
  onSelectPoint,
  onCommitPointTransform,
  transformActive,
}: ViewportCommandGeometryProps) {
  const previewAtom =
    commandState.hoverPoint && activeTool !== "select"
      ? getViewportCommand(activeTool).previewAtom?.(commandState, commandState.hoverPoint)
      : null;

  return (
    <>
      {Object.values(scene.objects).map((object) =>
        object.metadata.visible ? (
          <ViewportSceneObject
            color={color}
            dimmed={mode === "edit" && !selectedObjectIds.includes(object.id)}
            editColor={editColor}
            hoverColor={hoverColor}
            interactive={interactive}
            key={object.id}
            mode={mode}
            object={object}
            onCommitTransform={onCommitTransform}
            onCommitPointTransform={onCommitPointTransform}
            onContextMenu={onObjectContextMenu}
            onSelect={onSelectObject}
            onSelectPoint={onSelectPoint}
            onTransformEnd={onTransformEnd}
            onTransformStart={onTransformStart}
            selected={interactive && selectedObjectIds.includes(object.id)}
            selectedColor={draftColor}
            selectedPointKeys={object.id === selectedObjectId ? selectedPointKeys : []}
            transformActive={transformActive}
            transformActiveRef={transformActiveRef}
            transformMode={transformMode}
          />
        ) : null,
      )}
      {previewAtom ? (
        <ViewportAtomGeometry atom={previewAtom} color={draftColor} ghost showConstruction />
      ) : null}
    </>
  );
}
