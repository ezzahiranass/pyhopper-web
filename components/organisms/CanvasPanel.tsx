"use client";

import type { ReactNode } from "react";

import { FloatingPanel, type PanelLayout } from "@/components/organisms/FloatingPanel";
import { PanelHeader } from "@/components/organisms/PanelHeader";
import { useProjects } from "@/components/providers/ProjectsProvider";

type CanvasPanelProps = {
  children: ReactNode;
  layout: PanelLayout;
  onLayoutChange: (layout: PanelLayout) => void;
};

export function CanvasPanel({ children, layout, onLayoutChange }: CanvasPanelProps) {
  const { projects, activeProjectId } = useProjects();
  const activeProject = projects.find((project) => project.id === activeProjectId);

  const headerContent = (
    <PanelHeader
      eyebrow="PYHOPPER"
      eyebrowClassName="canvas-header__eyebrow"
      title={activeProject?.name ?? "Canvas"}
      titleClassName="canvas-header__title"
      titleWrapperClassName="canvas-header__title-block"
      wrapperClassName="canvas-header"
    />
  );

  return (
    <FloatingPanel headerContent={headerContent} layout={layout} onLayoutChange={onLayoutChange}>
      {children}
    </FloatingPanel>
  );
}
