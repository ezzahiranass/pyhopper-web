"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Euler, Matrix4, Quaternion, Vector3, type Camera } from "three";

import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { useViewportTool } from "@/components/providers/ViewportToolProvider";
import { editableObjectPoints } from "@/lib/scene/editing";
import { atomViewportPoints, sceneObjectAtoms } from "@/lib/scene/scene";
import type { SceneObject } from "@/lib/scene/types";

type ScreenRect = { left: number; right: number; top: number; bottom: number };

function objectMatrix(object: SceneObject) {
  return new Matrix4().compose(
    new Vector3(...object.transform.position),
    new Quaternion().setFromEuler(new Euler(...object.transform.rotation)),
    new Vector3(...object.transform.scale),
  );
}

function projectPoint(
  point: [number, number, number],
  object: SceneObject,
  camera: Camera,
  bounds: DOMRect,
) {
  const projected = new Vector3(
    point[0] - object.transform.pivot[0],
    point[1] - object.transform.pivot[1],
    point[2] - object.transform.pivot[2],
  )
    .applyMatrix4(objectMatrix(object))
    .project(camera);
  return {
    x: bounds.left + ((projected.x + 1) / 2) * bounds.width,
    y: bounds.top + ((1 - projected.y) / 2) * bounds.height,
  };
}

function contains(rect: ScreenRect, point: { x: number; y: number }) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

export function ViewportBoxSelection() {
  const { camera, gl } = useThree();
  const { scene } = useGraphEditor();
  const {
    activeTool,
    mode,
    selectedObjectId,
    selectObjects,
    selectPoints,
    transformActiveRef,
  } = useViewportTool();

  useEffect(() => {
    const canvas = gl.domElement;
    const overlay = document.createElement("div");
    overlay.className = "viewport-box-selection";
    overlay.hidden = true;
    canvas.parentElement?.appendChild(overlay);
    let start: { x: number; y: number } | null = null;
    let dragging = false;

    function updateOverlay(current: { x: number; y: number }) {
      if (!start) return;
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${Math.abs(current.x - start.x)}px`;
      overlay.style.height = `${Math.abs(current.y - start.y)}px`;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || activeTool !== "select" || transformActiveRef.current) return;
      start = { x: event.clientX, y: event.clientY };
      dragging = false;
    }

    function onPointerMove(event: PointerEvent) {
      if (!start || transformActiveRef.current) return;
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (distance < 4) return;
      dragging = true;
      overlay.hidden = false;
      updateOverlay({ x: event.clientX, y: event.clientY });
    }

    function onPointerUp(event: PointerEvent) {
      if (!start) return;
      if (dragging && !transformActiveRef.current) {
        const rect = {
          left: Math.min(start.x, event.clientX),
          right: Math.max(start.x, event.clientX),
          top: Math.min(start.y, event.clientY),
          bottom: Math.max(start.y, event.clientY),
        };
        const bounds = canvas.getBoundingClientRect();
        if (mode === "edit" && selectedObjectId) {
          const object = scene.objects[selectedObjectId];
          const keys = object
            ? editableObjectPoints(object)
                .filter((point) => contains(rect, projectPoint(point.position, object, camera, bounds)))
                .map((point) => point.key)
            : [];
          if (keys.length) selectPoints(keys);
        } else {
          const ids = Object.values(scene.objects)
            .filter((object) =>
              sceneObjectAtoms(object).some((atom) =>
                atomViewportPoints(atom).some((point) => contains(rect, projectPoint(point, object, camera, bounds))),
              ),
            )
            .map((object) => object.id);
          if (ids.length) selectObjects(ids);
        }
      }
      start = null;
      dragging = false;
      overlay.hidden = true;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      overlay.remove();
    };
  }, [activeTool, camera, gl, mode, scene, selectObjects, selectPoints, selectedObjectId, transformActiveRef]);

  return null;
}
