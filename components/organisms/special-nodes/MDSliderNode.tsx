"use client";

import type { PointerEvent } from "react";

import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { authoredDefaults } from "@/lib/graph/authoredValues";
import { portTooltip, type ComponentNodeData } from "@/lib/graph/types";

type MDSliderNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function MDSliderNode({ data, id, onContextMenu, title }: MDSliderNodeProps) {
  const { requestRealtimeGeneration, setNodeValue } = useGraphEditor();
  // the pad's range and precision are node settings; the handle position is authored
  const config = { ...(data.definition.settings_defaults ?? {}), ...data.settings };
  const defaults = authoredDefaults(data.definition);
  const xMin = numberValue(config.x_min, 0);
  const xMax = numberValue(config.x_max, 1);
  const yMin = numberValue(config.y_min, 0);
  const yMax = numberValue(config.y_max, 1);
  const decimals = numberValue(config.decimals, 2);
  const x = numberValue(data.values.x, numberValue(defaults.x, 0.5));
  const y = numberValue(data.values.y, numberValue(defaults.y, 0.5));
  const xRatio = (x - xMin) / Math.max(xMax - xMin, Number.EPSILON);
  const yRatio = (y - yMin) / Math.max(yMax - yMin, Number.EPSILON);
  const output = data.definition.outputs[0];

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextXRatio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const nextYRatio = Math.min(Math.max(1 - (event.clientY - bounds.top) / bounds.height, 0), 1);
    setNodeValue(id, "x", xMin + nextXRatio * (xMax - xMin));
    setNodeValue(id, "y", yMin + nextYRatio * (yMax - yMin));
    if (commit) requestRealtimeGeneration();
  };

  return (
    <article
      className={`component-node component-node--md-slider${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--preset">
        <div className="component-node__md-shell">
          <div
            className="component-node__md-pad nodrag"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateFromPointer(event, false);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event, false);
            }}
            onPointerUp={(event) => {
              updateFromPointer(event, true);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          >
            <span className="component-node__md-crosshair component-node__md-crosshair--x" style={{ left: `${xRatio * 100}%` }} />
            <span className="component-node__md-crosshair component-node__md-crosshair--y" style={{ top: `${(1 - yRatio) * 100}%` }} />
            <span className="component-node__md-thumb" style={{ left: `${xRatio * 100}%`, top: `${(1 - yRatio) * 100}%` }} />
          </div>
          <span className="component-node__md-value">{x.toFixed(decimals)} ; {y.toFixed(decimals)}</span>
        </div>
        <div className="component-node__ports component-node__ports--right">
          <GraphPortRow
            handleClassName="component-node__handle component-node__handle--source"
            handleId={output.name}
            kind="output"
            title={portTooltip(output)}
          />
        </div>
      </div>
    </article>
  );
}
