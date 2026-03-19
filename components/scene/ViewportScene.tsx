"use client";

import { Suspense, useEffect } from "react";
import { Grid } from "@react-three/drei";

import type { RenderManifest } from "@/components/flow/types";
import { GeneratedGlb } from "@/components/scene/GeneratedGlb";

type ViewportSceneProps = {
  modelUrl?: string | null;
  renderManifest?: RenderManifest | null;
  selectedNodeIds: string[];
};

export function ViewportScene({ modelUrl, renderManifest, selectedNodeIds }: ViewportSceneProps) {
  useEffect(() => {
    console.log("ViewportScene modelUrl:", modelUrl);
  }, [modelUrl]);

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
