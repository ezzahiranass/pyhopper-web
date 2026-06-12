"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Grid } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

import { ViewportCommandGeometry } from "@/components/organisms/ViewportCommandGeometry";
import { GeneratedGlb } from "@/components/organisms/GeneratedGlb";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { useViewportTool } from "@/components/providers/ViewportToolProvider";
import type { RenderManifest } from "@/lib/graph/types";

type ViewportSceneProps = {
  modelUrl?: string | null;
  renderManifest?: RenderManifest | null;
  selectedNodeIds: string[];
  commandColor: string;
  commandDraftColor: string;
  commandEditColor: string;
  commandHoverColor: string;
};

export function ViewportScene({
  commandColor,
  commandDraftColor,
  commandEditColor,
  commandHoverColor,
  modelUrl,
  renderManifest,
  selectedNodeIds,
}: ViewportSceneProps) {
  const {
    activeTool,
    commitObjectTransform,
    commitPointTransform,
    commandState,
    mode,
    placePoint,
    selectedObjectId,
    selectedObjectIds,
    selectedPointKeys,
    selectObject,
    selectPoints,
    setHoverPoint,
    transformActiveRef,
    transformMode,
  } = useViewportTool();
  const { scene } = useGraphEditor();
  const [transformActive, setTransformActive] = useState(false);
  const suppressGroundClickRef = useRef(false);
  const suppressGroundClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log("ViewportScene modelUrl:", modelUrl);
  }, [modelUrl]);

  useEffect(() => {
    return () => {
      if (suppressGroundClickTimerRef.current) {
        clearTimeout(suppressGroundClickTimerRef.current);
      }
      transformActiveRef.current = false;
    };
  }, [transformActiveRef]);

  function handleGroundClick(e: ThreeEvent<MouseEvent>) {
    if (suppressGroundClickRef.current) {
      e.stopPropagation();
      return;
    }
    if (activeTool === "select") {
      return;
    }
    e.stopPropagation();
    placePoint([e.point.x, e.point.y, e.point.z]);
  }

  return (
    <>
      <ambientLight intensity={1.2} />
      <hemisphereLight intensity={0.7} groundColor="#86959b" color="#f7fbfc" />
      <directionalLight
        castShadow
        intensity={1.8}
        position={[12, 18, 9]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight intensity={0.55} position={[-10, 8, -6]} />
      <Grid
        args={[140, 140]}
        cellColor="#8a989e"
        cellSize={0.75}
        cellThickness={0.22}
        fadeDistance={110}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, 0, 0]}
        sectionColor="#53666e"
        sectionSize={6}
        sectionThickness={0.45}
      />

      {/* Ground plane — captures point placement clicks */}
      <mesh
        onClick={handleGroundClick}
        onPointerMove={(event) => {
          if (activeTool !== "select") setHoverPoint([event.point.x, event.point.y, event.point.z]);
        }}
        onPointerOut={() => setHoverPoint(null)}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <ViewportCommandGeometry
        activeTool={activeTool}
        color={commandColor}
        commandState={commandState}
        draftColor={commandDraftColor}
        editColor={commandEditColor}
        hoverColor={commandHoverColor}
        interactive={activeTool === "select"}
        mode={mode}
        onCommitPointTransform={commitPointTransform}
        onCommitTransform={commitObjectTransform}
        onObjectContextMenu={(objectId, event) => {
          if (!selectedObjectIds.includes(objectId)) {
            selectObject(objectId);
          }
          window.dispatchEvent(
            new CustomEvent("pyhopper-scene-object-contextmenu", {
              detail: {
                clientX: event.nativeEvent.clientX,
                clientY: event.nativeEvent.clientY,
                objectId,
              },
            }),
          );
        }}
        onSelectObject={selectObject}
        onSelectPoint={(key) => selectPoints([key])}
        onTransformEnd={() => {
          suppressGroundClickRef.current = true;
          if (suppressGroundClickTimerRef.current) {
            clearTimeout(suppressGroundClickTimerRef.current);
          }
          suppressGroundClickTimerRef.current = setTimeout(() => {
            transformActiveRef.current = false;
            setTransformActive(false);
            suppressGroundClickRef.current = false;
            suppressGroundClickTimerRef.current = null;
          }, 0);
        }}
        onTransformStart={() => {
          if (suppressGroundClickTimerRef.current) {
            clearTimeout(suppressGroundClickTimerRef.current);
            suppressGroundClickTimerRef.current = null;
          }
          transformActiveRef.current = true;
          setTransformActive(true);
          suppressGroundClickRef.current = true;
        }}
        scene={scene}
        selectedObjectId={selectedObjectId}
        selectedObjectIds={selectedObjectIds}
        selectedPointKeys={selectedPointKeys}
        transformActive={transformActive}
        transformActiveRef={transformActiveRef}
        transformMode={transformMode}
      />

      {modelUrl ? (
        <Suspense fallback={null}>
          <GeneratedGlb
            key={modelUrl}
            renderManifest={renderManifest}
            selectedNodeIds={selectedNodeIds}
            url={modelUrl}
          />
        </Suspense>
      ) : null}
    </>
  );
}
