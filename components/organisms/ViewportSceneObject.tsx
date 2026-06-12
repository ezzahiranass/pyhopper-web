import type { ThreeEvent } from "@react-three/fiber";
import { useRef, useState, type MutableRefObject } from "react";
import { Matrix4, type Vector3Tuple } from "three";

import { ViewportAtomGeometry } from "@/components/molecules/ViewportAtomGeometry";
import { ViewportPointTransform } from "@/components/molecules/ViewportPointTransform";
import type { TransformMode, ViewportMode } from "@/components/providers/ViewportToolProvider";
import {
  editableObjectPoints,
  objectGeometryWorldCenter,
  objectLocalPointToWorld,
  objectTransformAfterWorldDelta,
  pointsBoundsCenter,
  transformObjectPoints,
} from "@/lib/scene/editing";
import { sceneObjectAtoms } from "@/lib/scene/scene";
import { updateSceneObjectTransform } from "@/lib/scene/transforms";
import type { SceneObject } from "@/lib/scene/types";

type ViewportSceneObjectProps = {
  color: string;
  dimmed: boolean;
  editColor: string;
  hoverColor: string;
  interactive: boolean;
  object: SceneObject;
  mode: ViewportMode;
  onCommitTransform: (
    objectId: string,
    position: Vector3Tuple,
    rotation: Vector3Tuple,
    scale: Vector3Tuple,
  ) => void;
  onContextMenu: (id: string, event: ThreeEvent<MouseEvent>) => void;
  onSelect: (id: string) => void;
  onSelectPoint: (key: string) => void;
  onCommitPointTransform: (objectId: string, pointKeys: string[], worldDelta: Matrix4) => void;
  onTransformEnd: () => void;
  onTransformStart: () => void;
  selected: boolean;
  selectedColor: string;
  selectedPointKeys: string[];
  transformActive: boolean;
  transformActiveRef: MutableRefObject<boolean>;
  transformMode: TransformMode;
};

export function ViewportSceneObject({
  color,
  dimmed,
  editColor,
  hoverColor,
  interactive,
  object,
  mode,
  onCommitTransform,
  onContextMenu,
  onSelect,
  onSelectPoint,
  onCommitPointTransform,
  onTransformEnd,
  onTransformStart,
  selected,
  selectedColor,
  selectedPointKeys,
  transformActive,
  transformActiveRef,
  transformMode,
}: ViewportSceneObjectProps) {
  const [hovered, setHovered] = useState(false);
  const [previewObject, setPreviewObject] = useState<SceneObject | null>(null);
  const objectTransformStartRef = useRef(object);
  const pointTransformStartRef = useRef(object);
  const displayedObject = previewObject ?? object;
  const transform = displayedObject.transform;
  const displayColor =
    selected && mode === "edit"
      ? editColor
      : selected
        ? selectedColor
        : interactive && hovered
          ? hoverColor
          : color;
  const selectedPoints = editableObjectPoints(displayedObject).filter((point) => selectedPointKeys.includes(point.key));
  const selectedPointCenter = pointsBoundsCenter(selectedPoints.map((point) => point.position));
  const selectedPointWorldCenter = selectedPointCenter
    ? objectLocalPointToWorld(displayedObject, selectedPointCenter)
    : null;
  const objectWorldCenter = objectGeometryWorldCenter(displayedObject);

  const geometry = (
    <group
      position={[-transform.pivot[0], -transform.pivot[1], -transform.pivot[2]]}
      onClick={(event) => {
        if (!interactive || transformActiveRef.current) return;
        event.stopPropagation();
        if (mode === "object") onSelect(object.id);
      }}
      onContextMenu={(event) => {
        if (!interactive || transformActiveRef.current) return;
        event.nativeEvent.preventDefault();
        event.stopPropagation();
        onContextMenu(object.id, event);
      }}
      onPointerOut={() => {
        if (!selected && !transformActiveRef.current) setHovered(false);
      }}
      onPointerOver={(event) => {
        if (!interactive || selected || transformActiveRef.current) return;
        event.stopPropagation();
        setHovered(true);
      }}
    >
      {sceneObjectAtoms(displayedObject).map((atom, index) => (
        <ViewportAtomGeometry
          atom={atom}
          atomIndex={index}
          color={displayColor}
          editMode={mode === "edit" && selected}
          hitTarget={interactive && !transformActive}
          key={`${object.id}-${index}`}
          markerHoverColor={transformActive ? undefined : hoverColor}
          markerSelectedColor={hoverColor}
          opacity={dimmed ? 0.18 : 1}
          onSelectPoint={(key) => {
            if (!transformActiveRef.current) onSelectPoint(key);
          }}
          selectedPointKeys={selectedPointKeys}
          showConstruction={selected || hovered}
        />
      ))}
    </group>
  );
  const objectGroup = (
    <group
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
    >
      {geometry}
    </group>
  );

  const pointTransform =
    selected && mode === "edit" && selectedPointWorldCenter && transformMode ? (
      <ViewportPointTransform
        key={selectedPointKeys.join("|")}
        mode={transformMode}
        onPreview={(worldDelta) => {
          setPreviewObject(transformObjectPoints(pointTransformStartRef.current, selectedPointKeys, worldDelta));
        }}
        onComplete={(worldDelta) => {
          setPreviewObject(null);
          onCommitPointTransform(object.id, selectedPointKeys, worldDelta);
        }}
        onTransformEnd={() => {
          onTransformEnd();
        }}
        onTransformStart={() => {
          pointTransformStartRef.current = object;
          onTransformStart();
        }}
        position={selectedPointWorldCenter}
      />
    ) : null;

  const objectTransform =
    mode === "object" && selected && transformMode && !object.metadata.locked ? (
      <ViewportPointTransform
        mode={transformMode}
        onPreview={(worldDelta) => {
          const next = objectTransformAfterWorldDelta(objectTransformStartRef.current, worldDelta);
          setPreviewObject({
            ...objectTransformStartRef.current,
            transform: updateSceneObjectTransform(
              objectTransformStartRef.current.transform,
              next.position,
              next.rotation,
              next.scale,
            ),
          });
        }}
        onComplete={(worldDelta) => {
          setPreviewObject(null);
          const next = objectTransformAfterWorldDelta(objectTransformStartRef.current, worldDelta);
          onCommitTransform(object.id, next.position, next.rotation, next.scale);
        }}
        onTransformEnd={onTransformEnd}
        onTransformStart={() => {
          objectTransformStartRef.current = object;
          onTransformStart();
        }}
        position={objectWorldCenter}
        rotation={object.transform.rotation}
        size={0.82}
      />
    ) : null;

  return (
    <>
      {objectGroup}
      {pointTransform}
      {objectTransform}
    </>
  );
}
