"use client";

import { GraphEditorProvider } from "@/components/providers/GraphEditorProvider";
import { ProjectsProvider, ProjectGate } from "@/components/providers/ProjectsProvider";
import { PyhopperFlowCanvas } from "@/components/templates/PyhopperFlowCanvas";
import { useEffect } from "react";

export default function CanvasPopout() {
  useEffect(() => {
    document.title = "Pyhopper – Canvas";
  }, []);

  return (
    <ProjectsProvider>
      <ProjectGate>
        {(activeProjectId) => (
          <GraphEditorProvider key={activeProjectId} projectId={activeProjectId}>
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
        )}
      </ProjectGate>
    </ProjectsProvider>
  );
}
