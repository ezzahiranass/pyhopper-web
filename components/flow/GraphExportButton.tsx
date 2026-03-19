"use client";

import { useEffect, useRef, useState } from "react";
import { CodeXml, LoaderCircle, SendHorizontal, Settings2 } from "lucide-react";

import { useGraphEditor } from "@/components/flow/GraphEditorContext";
import { Switch } from "@/components/ui/switch";

type GraphExportButtonProps = {
  isCodeView: boolean;
  onToggleCodeView: () => void;
};

export function GraphExportButton({ isCodeView, onToggleCodeView }: GraphExportButtonProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const {
    exportError,
    exportGraph,
    isExporting,
    nodes,
    realtimeGenerationEnabled,
    setRealtimeGenerationEnabled,
  } = useGraphEditor();
  const disabled = isExporting || nodes.length === 0;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="flow-export">
      {exportError ? <p className="flow-export__error">{exportError}</p> : null}
      <button
        aria-label={isCodeView ? "Show graph canvas" : "Show compiled Python"}
        className={`flow-export__button${isCodeView ? " flow-export__button--active" : ""}`}
        onClick={onToggleCodeView}
        title={isCodeView ? "Show graph canvas" : "Show compiled Python"}
        type="button"
      >
        <CodeXml className="flow-export__icon" />
      </button>
      <div className="flow-export__settings" ref={settingsRef}>
        {isSettingsOpen ? (
          <div className="flow-export__popover">
            <p className="flow-export__popover-title">Settings</p>
            <label className="flow-export__setting">
              <Switch
                checked={realtimeGenerationEnabled}
                onCheckedChange={setRealtimeGenerationEnabled}
              />
              <span>Realtime Generation (Experimental)</span>
            </label>
          </div>
        ) : null}
        <button
          aria-label="Open generation settings"
          className="flow-export__button"
          onClick={() => setIsSettingsOpen((current) => !current)}
          title="Generation settings"
          type="button"
        >
          <Settings2 className="flow-export__icon" />
        </button>
      </div>
      <button
        aria-label="Export graph to GLB"
        className="flow-export__button"
        disabled={disabled}
        onClick={() => void exportGraph()}
        title={exportError ?? "Compile the graph and load the generated GLB"}
        type="button"
      >
        {isExporting ? <LoaderCircle className="flow-export__icon flow-export__icon--spinning" /> : <SendHorizontal className="flow-export__icon" />}
      </button>
    </div>
  );
}
