"use client";

import { useEffect } from "react";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { useGraphEditor } from "@/components/flow/GraphEditorContext";
import { ViewportScene } from "@/components/scene/ViewportScene";

export function SceneCanvas() {
  const { modelUrl, renderManifest, selectedNodeIds } = useGraphEditor();

  useEffect(() => {
    console.log("SceneCanvas modelUrl:", modelUrl);
  }, [modelUrl]);

  return (
    <div className="scene-shell">
      <Canvas camera={{ position: [14, 10, 14], fov: 42 }} gl={{ alpha: true }}>
        <ViewportScene
          modelUrl={modelUrl}
          renderManifest={renderManifest}
          selectedNodeIds={selectedNodeIds}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={42}
        />
      </Canvas>
    </div>
  );
}
