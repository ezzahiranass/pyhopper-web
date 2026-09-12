"use client";

import { useState } from "react";

import { GraphExportButton } from "@/components/organisms/GraphExportButton";
import { ProjectChat } from "@/components/organisms/ProjectChat";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";

type CanvasActionBarProps = {
  isCodeView: boolean;
  onToggleCodeView: () => void;
};

export function CanvasActionBar({
  isCodeView,
  onToggleCodeView,
}: CanvasActionBarProps) {
  const { exportError } = useGraphEditor();
  const [activePopover, setActivePopover] = useState<"chat" | "settings" | null>(null);

  return (
    <>
      {exportError ? <p className="flow-canvas__error-notice">{exportError}</p> : null}
      <div className="flow-export">
        <ProjectChat
          open={activePopover === "chat"}
          onOpenChange={(open) => setActivePopover(open ? "chat" : null)}
        />
        <GraphExportButton
          isCodeView={isCodeView}
          isSettingsOpen={activePopover === "settings"}
          onSettingsOpenChange={(open) => setActivePopover(open ? "settings" : null)}
          onToggleCodeView={onToggleCodeView}
        />
      </div>
    </>
  );
}
