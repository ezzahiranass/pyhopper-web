"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LayoutGrid, Plus, Save } from "lucide-react";

import { IconButton } from "@/components/atoms/IconButton";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { useProjects } from "@/components/providers/ProjectsProvider";
import type { GraphImportResponse } from "@/lib/graph/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type ViewportDefinitionActionsProps = {
  onDefinitionsOpenChange: (isOpen: boolean) => void;
  showDefinitions: boolean;
};

export function ViewportDefinitionActions({
  onDefinitionsOpenChange,
  showDefinitions,
}: ViewportDefinitionActionsProps) {
  const router = useRouter();
  const { activeProjectId, createProject } = useProjects();
  const { autosaveEnabled, hasUnsavedChanges, importGraph, isSaving, saveCurrentDefinition } = useGraphEditor();
  const [isImportingTest, setIsImportingTest] = useState(false);
  const saveStatus = isSaving ? "Saving" : !autosaveEnabled && hasUnsavedChanges ? "Save" : "Saved";

  const createDefinition = () => {
    const nextProjectId = createProject();
    if (nextProjectId) {
      router.push(`/definitions/${nextProjectId}`);
    }
    onDefinitionsOpenChange(false);
  };

  const importTestDefinition = async () => {
    if (!activeProjectId || isImportingTest) return;

    try {
      setIsImportingTest(true);
      const response = await fetch(`${apiBaseUrl}/graphs/import-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId }),
      });
      const payload = (await response.json()) as GraphImportResponse | { error?: { message?: string } };

      if (!response.ok || !("flow" in payload)) {
        const message =
          "error" in payload && payload.error?.message
            ? payload.error.message
            : "Test graph import failed";
        throw new Error(message);
      }

      importGraph(payload);
      onDefinitionsOpenChange(false);
    } catch (error) {
      console.error("Failed to import test graph", error);
    } finally {
      setIsImportingTest(false);
    }
  };

  return (
    <>
      <div className="viewport-toolbar__actions">
        <IconButton className="viewport-toolbar__action" label="New definition" onClick={createDefinition}>
          <Plus />
        </IconButton>
        <IconButton
          className="viewport-toolbar__action"
          disabled={isImportingTest || !activeProjectId}
          label="Load test definition"
          onClick={() => void importTestDefinition()}
        >
          <Download />
        </IconButton>
        <IconButton
          aria-pressed={showDefinitions}
          className={`viewport-toolbar__action${showDefinitions ? " viewport-toolbar__action--active" : ""}`}
          label={showDefinitions ? "Close definitions" : "Browse definitions"}
          onClick={() => onDefinitionsOpenChange(!showDefinitions)}
        >
          <LayoutGrid />
        </IconButton>
        <IconButton
          className={`viewport-toolbar__action viewport-toolbar__action--with-label${hasUnsavedChanges ? " viewport-toolbar__action--dirty" : ""}`}
          disabled={autosaveEnabled || isSaving || !hasUnsavedChanges}
          label={saveStatus}
          onClick={() => void saveCurrentDefinition()}
        >
          <Save />
          <span>{saveStatus}</span>
        </IconButton>
      </div>
    </>
  );
}
