"use client";

import { Handle, NodeResizer, Position } from "@xyflow/react";

import type { ComponentNodeData, NodePreviewValue } from "@/components/flow/types";

type PanelNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
};

function getPanelPreview(data: ComponentNodeData): NodePreviewValue | null {
  const outputName = data.definition.outputs[0]?.name ?? "data";
  return data.previews[outputName] ?? data.previews.data ?? null;
}

export function PanelNode({ data, id, onContextMenu }: PanelNodeProps) {
  const preview = getPanelPreview(data);
  const inputId = data.definition.inputs[0]?.name ?? "data";
  const outputId = data.definition.outputs[0]?.name ?? "data";

  return (
    <article
      className={`component-node component-node--panel${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
    >
      <div className="component-node__body component-node__body--panel">
        <div className="component-node__panel-shell">
          <NodeResizer
            color="#7b7632"
            handleClassName="component-node__panel-resize-handle"
            isVisible
            lineClassName="component-node__panel-resize-line"
            minHeight={120}
            minWidth={180}
            nodeId={id}
          />
          <Handle
            className="component-node__handle component-node__panel-handle component-node__panel-handle--left"
            id={inputId}
            position={Position.Left}
            type="target"
          />
          <div className="component-node__panel-titlebar">
            <h3 className="component-node__panel-title">{data.definition.component}</h3>
          </div>

          <div className="component-node__panel-content">
            {preview?.kind === "data-tree" ? (
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
          <Handle
            className="component-node__handle component-node__panel-handle component-node__panel-handle--right"
            id={outputId}
            position={Position.Right}
            type="source"
          />
        </div>
      </div>
    </article>
  );
}
