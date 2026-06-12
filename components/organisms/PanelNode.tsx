"use client";

import { NodeResizer, Position } from "@xyflow/react";

import { GraphHandle } from "@/components/atoms/GraphHandle";
import { portTooltip, type ComponentNodeData, type NodePreviewValue } from "@/lib/graph/types";

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

export function PanelNode({ data, id, onContextMenu, title }: PanelNodeProps) {
  const preview = getPanelPreview(data);
  const inputPort = data.definition.inputs[0];
  const outputPort = data.definition.outputs[0];
  const inputId = inputPort?.name ?? "data";
  const outputId = outputPort?.name ?? "data";

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
            minHeight={120}
            minWidth={180}
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