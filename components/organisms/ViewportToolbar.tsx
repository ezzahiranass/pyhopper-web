"use client";

import { Select, type SelectOption } from "@/components/atoms/Select";
import { ViewportDefinitionActions } from "@/components/organisms/ViewportDefinitionActions";
import { useViewportTool } from "@/components/providers/ViewportToolProvider";

const MODE_OPTIONS: SelectOption<"object" | "edit">[] = [
  { label: "Object Mode", value: "object" },
  { label: "Edit Mode", value: "edit" },
];

type ViewportToolbarProps = {
  onDefinitionsOpenChange: (isOpen: boolean) => void;
  showDefinitions: boolean;
};

export function ViewportToolbar({
  onDefinitionsOpenChange,
  showDefinitions,
}: ViewportToolbarProps) {
  const { mode, selectedObjectIds, selectedPointKeys, setMode } = useViewportTool();
  const count = mode === "edit" ? selectedPointKeys.length : selectedObjectIds.length;

  return (
    <header className="viewport-toolbar" data-mode={mode}>
      <div className="viewport-mode-select">
        <span className="viewport-mode-select__label">Mode</span>
        <Select
          ariaLabel="Viewport interaction mode"
          className="viewport-mode-select__control"
          onChange={setMode}
          options={MODE_OPTIONS.map((option) => ({
            ...option,
            disabled: option.value === "edit" && selectedObjectIds.length !== 1,
          }))}
          value={mode}
        />
      </div>
      <span className="viewport-toolbar__status">
        {count} {mode === "edit" ? "point" : "object"}{count === 1 ? "" : "s"} selected
      </span>
      <ViewportDefinitionActions
        onDefinitionsOpenChange={onDefinitionsOpenChange}
        showDefinitions={showDefinitions}
      />
    </header>
  );
}
