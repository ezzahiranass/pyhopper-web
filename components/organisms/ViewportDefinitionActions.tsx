"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, LayoutGrid, Plus, Save, Upload } from "lucide-react";

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
  const { activeProjectId, createImportedProject, createProject } = useProjects();
  const { autosaveEnabled, hasUnsavedChanges, importGraph, isSaving, saveCurrentDefinition } = useGraphEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingGhx, setIsImportingGhx] = useState(false);
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

  const importGhxDefinition = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isImportingGhx) return;

    try {
      setIsImportingGhx(true);
      const response = await fetch(`${apiBaseUrl}/graphs/import-ghx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          "X-Filename": encodeURIComponent(file.name),
        },
        body: file,
      });
      const payload = (await response.json()) as GraphImportResponse | { error?: { message?: string } };
      if (!response.ok || !("flow" in payload)) {
        const message =
          "error" in payload && payload.error?.message
            ? payload.error.message
            : "GHX import failed";
        throw new Error(message);
      }

      const projectName = file.name.replace(/\.ghx$/i, "") || "Imported GHX";
      const projectId = createImportedProject(projectName, payload);
      if (!projectId) {
        throw new Error("Could not create the imported definition");
      }
      onDefinitionsOpenChange(false);
      router.push(`/definitions/${projectId}`);
    } catch (error) {
      console.error("Failed to import GHX graph", error);
      window.alert(error instanceof Error ? error.message : "GHX import failed");
    } finally {
      setIsImportingGhx(false);
    }
  };

  return (
    <>
      <div className="viewport-toolbar__actions">
        <IconButton className="viewport-toolbar__action" label="New definition" onClick={createDefinition}>
          <Plus />
        </IconButton>
        <input
          accept=".ghx,application/xml,text/xml"
          hidden
          onChange={(event) => void importGhxDefinition(event)}
          ref={fileInputRef}
          type="file"
        />
        <IconButton
          className="viewport-toolbar__action"
          disabled={isImportingGhx}
          label="Import GHX definition"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload />
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
