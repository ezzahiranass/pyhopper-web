"use client";

import { useEffect, useRef, useState } from "react";
import { CodeXml, LoaderCircle, SendHorizontal, Settings2 } from "lucide-react";

import { FloatingActionButton } from "@/components/molecules/FloatingActionButton";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Select } from "@/components/atoms/Select";
import { Switch } from "@/components/atoms/Switch";
import type { ThemeId } from "@/lib/theme/themes";

type GraphExportButtonProps = {
  isCodeView: boolean;
  onToggleCodeView: () => void;
};

export function GraphExportButton({ isCodeView, onToggleCodeView }: GraphExportButtonProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const { setTheme, theme, themeOptions } = useTheme();
  const {
    autosaveEnabled,
    exportError,
    exportGraph,
    hasUnsavedChanges,
    isExporting,
    isSaving,
    nodes,
    realtimeGenerationEnabled,
    setAutosaveEnabled,
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
      <FloatingActionButton
        className={`flow-export__button${isCodeView ? " flow-export__button--active" : ""}`}
        label={isCodeView ? "Show graph canvas" : "Show compiled Python"}
        onClick={onToggleCodeView}
      >
        <CodeXml className="flow-export__icon" />
      </FloatingActionButton>
      <div className="flow-export__settings" ref={settingsRef}>
        {isSettingsOpen ? (
          <div className="flow-export__popover">
            <p className="flow-export__popover-title">Settings</p>
            <label className="flow-export__setting">
              <Switch
                checked={autosaveEnabled}
                onCheckedChange={setAutosaveEnabled}
              />
              <span>Autosave to Firestore</span>
            </label>
            <label className="flow-export__setting">
              <Switch
                checked={realtimeGenerationEnabled}
                onCheckedChange={setRealtimeGenerationEnabled}
              />
              <span>Realtime Generation (Experimental)</span>
            </label>
            <p className="flow-export__hint">
              {autosaveEnabled
                ? "Changes sync automatically when the graph changes."
                : hasUnsavedChanges
                  ? "Autosave is off. Use Save in the canvas header to persist your changes."
                  : "Autosave is off. The current Firestore definition is already up to date."}
            </p>
            <label className="flow-export__setting flow-export__setting--stacked">
              <span className="flow-export__setting-copy">
                <span className="flow-export__setting-label">Theme</span>
                <span className="flow-export__setting-description">Apply one of the six imported UI token themes.</span>
              </span>
              <Select
                ariaLabel="Select interface theme"
                className="flow-export__select"
                onChange={(value) => setTheme(value as ThemeId)}
                options={themeOptions.map((option) => ({ label: option.label, value: option.id }))}
                value={theme}
              />
            </label>
          </div>
        ) : null}
        <FloatingActionButton
          className="flow-export__button"
          label="Generation settings"
          onClick={() => setIsSettingsOpen((current) => !current)}
        >
          <Settings2 className="flow-export__icon" />
        </FloatingActionButton>
      </div>
      <FloatingActionButton
        className="flow-export__button"
        disabled={disabled}
        label={exportError ?? (isSaving ? "Saving definition" : "Compile the graph and load the generated GLB")}
        onClick={() => void exportGraph()}
      >
        {isExporting ? <LoaderCircle className="flow-export__icon flow-export__icon--spinning" /> : <SendHorizontal className="flow-export__icon" />}
      </FloatingActionButton>
    </div>
  );
}
