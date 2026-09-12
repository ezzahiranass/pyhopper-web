"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";

import { SplitPaneDivider } from "@/components/atoms/SplitPaneDivider";
import { CanvasPanel } from "@/components/organisms/CanvasPanel";
import type { PanelLayout } from "@/components/organisms/FloatingPanel";
import { GraphEditorProvider } from "@/components/providers/GraphEditorProvider";
import { SceneCanvas } from "@/components/templates/SceneCanvas";
import { PyhopperFlowCanvas } from "@/components/templates/PyhopperFlowCanvas";

export function StudioWorkspace({ projectId }: { projectId: string }) {
  const [layout, setLayout] = useState<PanelLayout>("floating");
  const [splitPosition, setSplitPosition] = useState(50);
  const dividerPointerId = useRef<number | null>(null);

  const clampSplitPosition = (position: number) => Math.min(80, Math.max(20, position));
  const updateSplitFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const position =
      layout === "split-horizontal"
        ? (event.clientX / window.innerWidth) * 100
        : (event.clientY / window.innerHeight) * 100;
    setSplitPosition(clampSplitPosition(position));
  };
  const handleDividerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dividerPointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSplitFromPointer(event);
  };
  const handleDividerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dividerPointerId.current === event.pointerId) {
      updateSplitFromPointer(event);
    }
  };
  const handleDividerPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dividerPointerId.current !== event.pointerId) return;
    dividerPointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const handleDividerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const decrementKey = layout === "split-horizontal" ? "ArrowLeft" : "ArrowUp";
    const incrementKey = layout === "split-horizontal" ? "ArrowRight" : "ArrowDown";
    if (![decrementKey, incrementKey, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setSplitPosition((current) => {
      if (event.key === "Home") return 20;
      if (event.key === "End") return 80;
      return clampSplitPosition(current + (event.key === decrementKey ? -2 : 2));
    });
  };
  const shellStyle = {
    "--studio-split-position": `${splitPosition}%`,
  } as CSSProperties;

  return (
    <GraphEditorProvider key={projectId} projectId={projectId}>
      <main className="app-shell" data-layout={layout} style={shellStyle}>
        <div className="studio-scene-pane">
          <SceneCanvas />
        </div>
        <div className="app-overlay">
          <CanvasPanel layout={layout} onLayoutChange={setLayout}>
            <PyhopperFlowCanvas />
          </CanvasPanel>
        </div>
        {layout !== "floating" ? (
          <SplitPaneDivider
            orientation={layout === "split-horizontal" ? "vertical" : "horizontal"}
            onKeyDown={handleDividerKeyDown}
            onPointerCancel={handleDividerPointerUp}
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
            valueNow={splitPosition}
          />
        ) : null}
      </main>
    </GraphEditorProvider>
  );
}
