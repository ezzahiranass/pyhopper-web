"use client";

import { PyhopperFlowCanvas } from "@/components/flow/PyhopperFlowCanvas";
import { useEffect } from "react";

export default function CanvasPopout() {
  useEffect(() => {
    document.title = "Pyhopper – Canvas";
  }, []);

  return (
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
  );
}
