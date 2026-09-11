"use client";

import { useEffect, useRef, type RefObject } from "react";
import { addAfterEffect, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ViewportGizmo } from "three-viewport-gizmo";

type ViewportOrientationGizmoProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
};

export function ViewportOrientationGizmo({
  controlsRef,
  enabled,
}: ViewportOrientationGizmoProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const gizmoRef = useRef<ViewportGizmo | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    const container = gl.domElement.parentElement;
    if (!controls || !container) return;

    const gizmo = new ViewportGizmo(camera, gl, {
      className: "viewport-orientation-gizmo",
      container,
      offset: { right: 12, top: 58 },
      placement: "top-right",
      size: 104,
      speed: 1.5,
    });

    const keepControlsState = () => {
      controls.enabled = gizmo.enabled;
    };

    gizmo.attachControls(
      controls as unknown as Parameters<ViewportGizmo["attachControls"]>[0],
    );
    gizmo.addEventListener("end", keepControlsState);
    gizmo.enabled = controls.enabled;
    gizmoRef.current = gizmo;

    const removeAfterEffect = addAfterEffect(() => gizmo.render());

    return () => {
      removeAfterEffect();
      gizmo.removeEventListener("end", keepControlsState);
      gizmo.dispose();
      gizmoRef.current = null;
    };
  }, [camera, controlsRef, gl]);

  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo) return;

    gizmo.enabled = enabled;
    gizmo.update();
  }, [enabled, size.height, size.width]);

  return null;
}
