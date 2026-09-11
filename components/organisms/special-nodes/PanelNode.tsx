"use client";

import { useState } from "react";
import { NodeResizer, Position } from "@xyflow/react";

import { GraphHandle } from "@/components/atoms/GraphHandle";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { portTooltip, type ComponentNodeData, type NodePreviewValue, type PanelTextAlignment } from "@/lib/graph/types";

type PanelNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

function getPanelPreview(data: ComponentNodeData): NodePreviewValue | null {
  const outputName = data.definition.outputs[0]?.name ?? "data";
  return data.previews[outputName] ?? data.previews.data ?? null;
}

function formatAuthoredPanelLine(line: string): string {
  const candidate = line.trim();
  const normalized = candidate.toLowerCase();

  if (normalized === "true") return "True";
  if (normalized === "false") return "False";
  if (/^[+-]?\d+$/.test(candidate)) return String(Number.parseInt(candidate, 10));
  if (/^[+-]?(?:(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+)$/.test(candidate)) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return Number.isInteger(value) ? `${value}.0` : String(value);
  }

  return `'${line.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

export function PanelNode({ data, id, onContextMenu, title }: PanelNodeProps) {
  const { edges, requestRealtimeGeneration, setNodeValue } = useGraphEditor();
  const preview = getPanelPreview(data);
  const inputPort = data.definition.inputs[0];
  const outputPort = data.definition.outputs[0];
  const inputId = inputPort?.name ?? "data";
  const outputId = outputPort?.name ?? "data";
  const hasIncomingData = edges.some(
    (edge) => edge.target === id && edge.targetHandle === inputId,
  );
  const authoredText = typeof data.values.text === "string" ? data.values.text : "";
  const multilineData = data.values.multilineData === true;
  const authoredMultilineItems = multilineData
    ? authoredText.split(/\r\n|\r|\n/).map(formatAuthoredPanelLine)
    : [];
  const textAlign: PanelTextAlignment =
    data.values.textAlign === "center" || data.values.textAlign === "right"
      ? data.values.textAlign
      : "left";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(authoredText);
  const showEditor = isEditing && !hasIncomingData;

  const commitDraft = () => {
    setNodeValue(id, "text", draft);
    setIsEditing(false);
    requestRealtimeGeneration();
  };

  return (
    <article
      className={`component-node component-node--panel${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--panel">
        <div className="component-node__panel-shell">
          <NodeResizer
            color="#7b7632"
            handleClassName="component-node__panel-resize-handle"
            isVisible
            lineClassName="component-node__panel-resize-line"
            minHeight={52}
            minWidth={90}
            nodeId={id}
          />
          <GraphHandle
            className="component-node__handle component-node__panel-handle component-node__panel-handle--left"
            id={inputId}
            position={Position.Left}
            title={inputPort ? portTooltip(inputPort) : undefined}
            type="target"
          />
          <div className="component-node__panel-titlebar">
            <h3 className="component-node__panel-title">{data.definition.component}</h3>
          </div>

          <div
            className={`component-node__panel-content${hasIncomingData ? "" : " component-node__panel-content--source"}`}
            onDoubleClick={(event) => {
              if (hasIncomingData) return;
              event.stopPropagation();
              setDraft(authoredText);
              setIsEditing(true);
            }}
            style={{ textAlign }}
          >
            {showEditor ? (
              <textarea
                aria-label="Panel text"
                autoFocus
                className="component-node__panel-editor nodrag nowheel"
                onBlur={commitDraft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (
                    event.key === "Enter" &&
                    ((!multilineData && !event.shiftKey) ||
                      (multilineData && (event.ctrlKey || event.metaKey)))
                  ) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                value={draft}
              />
            ) : !hasIncomingData && multilineData ? (
              <div className="component-node__panel-branch">
                <div className="component-node__panel-path">{"{0}"}</div>
                {authoredMultilineItems.map((value, index) => (
                  <div className="component-node__panel-row" key={`${index}-${value}`}>
                    <span className="component-node__panel-index">{index}</span>
                    <span className="component-node__panel-value">{value}</span>
                  </div>
                ))}
              </div>
            ) : !hasIncomingData ? (
              <div
                className={`component-node__panel-source-text${authoredText ? "" : " component-node__panel-source-text--empty"}`}
              >
                {authoredText || "Double-click to enter text"}
              </div>
            ) : preview?.kind === "data-tree" ? (
              preview.branches.length ? (
                preview.branches.map((branch) => (
                  <div className="component-node__panel-branch" key={branch.path}>
                    <div className="component-node__panel-path">{branch.path}</div>
                    {branch.items.length ? (
                      branch.items.map((item) => (
                        <div className="component-node__panel-row" key={`${branch.path}-${item.index}`}>
                          <span className="component-node__panel-index">{item.index}</span>
                          <span className="component-node__panel-value">{item.value}</span>
                        </div>
                      ))
                    ) : (
                      <div className="component-node__panel-empty-row">Empty branch</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="component-node__panel-empty">No branches</div>
              )
            ) : preview?.kind === "value" ? (
              <div className="component-node__panel-empty">{preview.value}</div>
            ) : (
              <div className="component-node__panel-empty">No data</div>
            )}
          </div>
          <GraphHandle
            className="component-node__handle component-node__panel-handle component-node__panel-handle--right"
            id={outputId}
            position={Position.Right}
            title={outputPort ? portTooltip(outputPort) : undefined}
            type="source"
          />
        </div>
      </div>
    </article>
  );
}
