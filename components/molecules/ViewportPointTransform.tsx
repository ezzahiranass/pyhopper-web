import { TransformControls } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Euler, Group, Matrix4, type Vector3Tuple } from "three";

import type { TransformMode } from "@/components/providers/ViewportToolProvider";

type ViewportPointTransformProps = {
  mode: Exclude<TransformMode, null>;
  onPreview?: (worldDelta: Matrix4) => void;
  onComplete?: (worldDelta: Matrix4) => void;
  onTransformEnd: () => void;
  onTransformStart: () => void;
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  size?: number;
};

export function ViewportPointTransform({
  mode,
  onComplete,
  onPreview,
  onTransformEnd,
  onTransformStart,
  position,
  rotation = [0, 0, 0],
  size = 0.72,
}: ViewportPointTransformProps) {
  const group = useMemo(() => new Group(), []);
  const dragStartMatrixRef = useRef(new Matrix4());
  const draggingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onPreviewRef = useRef(onPreview);
  const onTransformEndRef = useRef(onTransformEnd);
  const positionRef = useRef(position);
  const rotationRef = useRef(rotation);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
    onPreviewRef.current = onPreview;
    onTransformEndRef.current = onTransformEnd;
    positionRef.current = position;
    rotationRef.current = rotation;
  }, [onComplete, onPreview, onTransformEnd, position, rotation]);

  const resetGroup = useCallback(() => {
    group.position.set(...positionRef.current);
    group.quaternion.setFromEuler(new Euler(...rotationRef.current));
    group.scale.set(1, 1, 1);
    group.updateMatrixWorld();
  }, [group]);

  const finishTransform = useCallback(() => {
    if (!draggingRef.current) return;
    group.updateMatrixWorld();
    const worldDelta = group.matrixWorld.clone().multiply(dragStartMatrixRef.current.clone().invert());
    draggingRef.current = false;
    onCompleteRef.current?.(worldDelta);
    onTransformEndRef.current();
    resetGroup();
  }, [group, resetGroup]);

  useLayoutEffect(() => {
    if (!draggingRef.current) resetGroup();
  }, [position, resetGroup, rotation]);

  useEffect(() => {
    window.addEventListener("pointercancel", finishTransform);
    window.addEventListener("blur", finishTransform);
    return () => {
      window.removeEventListener("pointercancel", finishTransform);
      window.removeEventListener("blur", finishTransform);
      finishTransform();
    };
  }, [finishTransform]);

  return (
    <>
      <primitive object={group} />
      <TransformControls
        mode={mode}
        object={group}
        onMouseDown={() => {
          draggingRef.current = true;
          group.updateMatrixWorld();
          dragStartMatrixRef.current.copy(group.matrixWorld);
          onTransformStart();
        }}
        onMouseUp={finishTransform}
        onObjectChange={() => {
          if (!draggingRef.current) return;
          group.updateMatrixWorld();
          onPreviewRef.current?.(group.matrixWorld.clone().multiply(dragStartMatrixRef.current.clone().invert()));
        }}
        size={size}
        space={mode === "translate" ? "world" : "local"}
      />
    </>
  );
}
