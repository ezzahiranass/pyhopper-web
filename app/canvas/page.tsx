"use client";

import { GraphEditorProvider } from "@/components/flow/GraphEditorContext";
import { PyhopperFlowCanvas } from "@/components/flow/PyhopperFlowCanvas";
import { useEffect } from "react";

export default function CanvasPopout() {
  useEffect(() => {
    document.title = "Pyhopper – Canvas";
  }, []);

  return (
    <GraphEditorProvider>
      <main
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "var(--background)",
        }}
      >
        <PyhopperFlowCanvas />
      </main>
    </GraphEditorProvider>
  );
}
