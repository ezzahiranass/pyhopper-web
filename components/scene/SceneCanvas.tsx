"use client";

import { useState } from "react";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { SceneActionButton } from "@/components/scene/SceneActionButton";
import { ViewportScene } from "@/components/scene/ViewportScene";

export function SceneCanvas() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const handleRunTest = async () => {
    if (isRunningTest) {
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

    try {
      setIsRunningTest(true);

      const response = await fetch(`${apiBaseUrl}/test-glb`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Test export failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { glb_url?: string };
      if (!payload.glb_url) {
        throw new Error("Test export did not return a GLB URL");
      }

      setModelUrl(payload.glb_url);
    } catch (error) {
      console.error("Failed to run backend GLB test", error);
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="scene-shell">
      <Canvas camera={{ position: [14, 10, 14], fov: 42 }}>
        <color attach="background" args={["#d8e0e4"]} />
        <fog attach="fog" args={["#d8e0e4", 22, 54]} />
        <ViewportScene modelUrl={modelUrl} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={42}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      <div className="scene-actions">
        <SceneActionButton busy={isRunningTest} onClick={handleRunTest} />
      </div>
    </div>
  );
}
