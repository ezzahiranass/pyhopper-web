"use client";

import { useEffect, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE } from "three";

import { ViewportBoxSelection } from "@/components/organisms/ViewportBoxSelection";
import { DefinitionsPanel } from "@/components/organisms/DefinitionsPanel";
import { ViewportScene } from "@/components/organisms/ViewportScene";
import { ViewportSidebar } from "@/components/organisms/ViewportSidebar";
import { ViewportToolbar } from "@/components/organisms/ViewportToolbar";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import {
  ViewportToolProvider,
  useViewportTool,
} from "@/components/providers/ViewportToolProvider";
import { useThemeToken } from "@/lib/theme/useThemeToken";

function ViewportControls() {
  const { activeTool } = useViewportTool();
  return (
    <OrbitControls
      dampingFactor={0.08}
      enabled={activeTool === "select"}
      enableDamping
      makeDefault
      maxDistance={42}
      minDistance={6}
      mouseButtons={{ LEFT: undefined, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
    />
  );
}

function SceneCanvasInner() {
  const { modelUrl, renderManifest, scene, selectedNodeIds } = useGraphEditor();
  const { activeTool, createReference } = useViewportTool();
  const [contextMenu, setContextMenu] = useState<{ objectId: string; x: number; y: number } | null>(null);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const commandColor = useThemeToken("--accent", "#1f3d3a");
  const commandHoverColor = useThemeToken("--viewport-object-hover", "#3f9cff");
  const commandSelectedColor = useThemeToken("--viewport-object-selected", "#c08020");
  const commandEditColor = useThemeToken("--viewport-object-edit", "#8b5cf6");

  useEffect(() => {
    console.log("SceneCanvas modelUrl:", modelUrl);
  }, [modelUrl]);

  useEffect(() => {
    function handleContextMenu(event: Event) {
      const detail = (event as CustomEvent<{ clientX: number; clientY: number; objectId: string }>).detail;
      setContextMenu({ objectId: detail.objectId, x: detail.clientX, y: detail.clientY });
    }
    window.addEventListener("pyhopper-scene-object-contextmenu", handleContextMenu);
    return () => window.removeEventListener("pyhopper-scene-object-contextmenu", handleContextMenu);
  }, []);

  const visibleContextMenu =
    contextMenu && scene.objects[contextMenu.objectId] ? contextMenu : null;

  return (
    <div
      className="scene-shell"
      data-active-tool={activeTool}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={() => setContextMenu(null)}
    >
      <Canvas camera={{ position: [14, 10, 14], fov: 42 }} gl={{ alpha: true }}>
        <ViewportScene
          commandColor={commandColor}
          commandDraftColor={commandSelectedColor}
          commandEditColor={commandEditColor}
          commandHoverColor={commandHoverColor}
          modelUrl={modelUrl}
          renderManifest={renderManifest}
          selectedNodeIds={selectedNodeIds}
        />
        <ViewportBoxSelection />
        <ViewportControls />
      </Canvas>
      <ViewportToolbar
        onDefinitionsOpenChange={setShowDefinitions}
        showDefinitions={showDefinitions}
      />
      <ViewportSidebar />
      <DefinitionsPanel isOpen={showDefinitions} onClose={() => setShowDefinitions(false)} />
      {visibleContextMenu ? (
        <div
          className="scene-object-menu"
          onPointerDown={(event) => event.stopPropagation()}
          style={{ left: visibleContextMenu.x, top: visibleContextMenu.y }}
        >
          <button
            className="scene-object-menu__item"
            onClick={() => {
              createReference(visibleContextMenu.objectId);
              setContextMenu(null);
            }}
            type="button"
          >
            Create Reference
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SceneCanvas() {
  return (
    <ViewportToolProvider>
      <SceneCanvasInner />
    </ViewportToolProvider>
  );
}
