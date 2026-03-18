"use client";

import { Suspense } from "react";

import { Grid } from "@react-three/drei";

import { GeneratedGlb } from "@/components/scene/GeneratedGlb";

type ViewportSceneProps = {
  modelUrl?: string | null;
};

export function ViewportScene({ modelUrl }: ViewportSceneProps) {
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

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#b5c0c4" roughness={1} />
      </mesh>

      <Grid
        args={[120, 120]}
        cellColor="#6c7f86"
        cellSize={0.75}
        cellThickness={0.5}
        fadeDistance={90}
        fadeStrength={1.4}
        infiniteGrid
        position={[0, 0.02, 0]}
        sectionColor="#40545d"
        sectionSize={6}
        sectionThickness={1.1}
      />

      {modelUrl ? (
        <Suspense fallback={null}>
          <GeneratedGlb url={modelUrl} />
        </Suspense>
      ) : null}
    </>
  );
}
