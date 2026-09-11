"use client";

import { useEffect, useRef } from "react";
import { CodeXml, LoaderCircle, SendHorizontal, Settings2, X } from "lucide-react";

import { FloatingActionButton } from "@/components/molecules/FloatingActionButton";
import { FloatingActionPanel } from "@/components/molecules/FloatingActionPanel";
import { FloatingActionPanelHeader } from "@/components/molecules/FloatingActionPanelHeader";
import { IconButton } from "@/components/atoms/IconButton";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Select } from "@/components/atoms/Select";
import { Switch } from "@/components/atoms/Switch";
import type { ThemeId } from "@/lib/theme/themes";

type GraphExportButtonProps = {
  isCodeView: boolean;
  isSettingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onToggleCodeView: () => void;
};

export function GraphExportButton({
  isCodeView,
  isSettingsOpen,
  onSettingsOpenChange,
  onToggleCodeView,
}: GraphExportButtonProps) {
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
    nodeTitleMode,
    realtimeGenerationEnabled,
    setAutosaveEnabled,
    setNodeTitleMode,
    setRealtimeGenerationEnabled,
  } = useGraphEditor();
  const disabled = isExporting || nodes.length === 0;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      const isSelectMenu = target instanceof Element && target.closest("[data-floating-select-menu]");
      if (!settingsRef.current?.contains(target as Node) && !isSelectMenu) {
        onSettingsOpenChange(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [onSettingsOpenChange]);

  return (
    <>
      <FloatingActionButton
        className={`flow-export__button${isCodeView ? " flow-export__button--active" : ""}`}
        label={isCodeView ? "Show graph canvas" : "Show compiled Python"}
        onClick={onToggleCodeView}
      >
        <CodeXml className="flow-export__icon" />
      </FloatingActionButton>
      <div className="flow-export__settings" ref={settingsRef}>
        {isSettingsOpen ? (
          <FloatingActionPanel className="flow-export__popover">
            <FloatingActionPanelHeader
              actions={
                <IconButton className="chat-header__btn" label="Close settings" onClick={() => onSettingsOpenChange(false)}>
                  <X />
                </IconButton>
              }
              meta="Canvas and generation preferences"
              title="Settings"
            />
            <div className="flow-export__settings-content">
              <label className="flow-export__setting">
                <Switch checked={autosaveEnabled} onCheckedChange={setAutosaveEnabled} />
                <span>Autosave to Firestore</span>
              </label>
              <label className="flow-export__setting">
                <Switch checked={nodeTitleMode === "nickname"} onCheckedChange={(checked) => setNodeTitleMode(checked ? "nickname" : "display")} />
                <span title="Show Grasshopper nicknames (Divide, LLX) on nodes instead of full names">Short node titles</span>
              </label>
              <label className="flow-export__setting">
                <Switch checked={realtimeGenerationEnabled} onCheckedChange={setRealtimeGenerationEnabled} />
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
          </FloatingActionPanel>
        ) : null}
        <FloatingActionButton
          className="flow-export__button"
          label="Generation settings"
          onClick={() => onSettingsOpenChange(!isSettingsOpen)}
        >
          <Settings2 className="flow-export__icon" />
        </FloatingActionButton>
      </div>
      <FloatingActionButton
        className="flow-export__button flow-export__button--generate"
        disabled={disabled}
        label={exportError ?? (isSaving ? "Saving definition" : "Compile the graph and load the generated GLB")}
        onClick={() => void exportGraph()}
      >
        {isExporting ? <LoaderCircle className="flow-export__icon flow-export__icon--spinning" /> : <SendHorizontal className="flow-export__icon" />}
      </FloatingActionButton>
    </>
  );
}
