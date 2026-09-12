"use client";

import type { PointerEvent } from "react";

import { NumberInput } from "@/components/atoms/NumberInput";
import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { evaluateNormalizedGraph } from "@/lib/graph/graphMapper";
import { portTooltip, type ComponentNodeData, type GraphMapperType } from "@/lib/graph/types";

type GraphMapperNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

const GRAPH_TYPES: GraphMapperType[] = ["bezier", "linear", "sine", "gaussian"];

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatDomainValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function GraphMapperNode({ data, id, onContextMenu, title }: GraphMapperNodeProps) {
  const { requestRealtimeGeneration, setNodeValue } = useGraphEditor();
  const graphType = GRAPH_TYPES.includes(data.values.graphType as GraphMapperType)
    ? (data.values.graphType as GraphMapperType)
    : "bezier";
  const controlY1 = numberValue(data.values.controlY1, 0.15);
  const controlY2 = numberValue(data.values.controlY2, 0.85);
  const xMin = numberValue(data.values.xMin, 0);
  const xMax = numberValue(data.values.xMax, 1);
  const yMin = numberValue(data.values.yMin, 0);
  const yMax = numberValue(data.values.yMax, 1);
  const input = data.definition.inputs[0];
  const output = data.definition.outputs[0];
  const points = Array.from({ length: 65 }, (_, index) => {
    const t = index / 64;
    const mapped = evaluateNormalizedGraph(graphType, t, controlY1, controlY2);
    return `${t * 180},${120 - mapped * 120}`;
  }).join(" ");

  const updateControl = (event: PointerEvent<SVGCircleElement>, key: "controlY1" | "controlY2", commit: boolean) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    const nextValue = Math.min(Math.max(1 - (event.clientY - bounds.top) / bounds.height, 0), 1);
    setNodeValue(id, key, nextValue);
    if (commit) requestRealtimeGeneration();
  };

  const domainInput = (label: string, key: "xMin" | "xMax" | "yMin" | "yMax", value: number) => (
    <label className="component-node__graph-domain">
      <span>{label}</span>
      <NumberInput
        className="component-node__graph-domain-input nodrag"
        onBlur={() => requestRealtimeGeneration()}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) setNodeValue(id, key, nextValue);
        }}
        step="0.1"
        value={value}
      />
    </label>
  );

  return (
    <article
      className={`component-node component-node--graph-mapper${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--graph-mapper">
        <div className="component-node__ports component-node__ports--left">
          <GraphPortRow
            handleClassName="component-node__handle component-node__handle--target"
            handleId={input.name}
            kind="input"
            title={portTooltip(input)}
          />
        </div>
        <div className="component-node__graph-shell">
          <select
            aria-label="Graph Mapper type"
            className="component-node__graph-select nodrag"
            onChange={(event) => {
              setNodeValue(id, "graphType", event.target.value);
              requestRealtimeGeneration();
            }}
            value={graphType}
          >
            {GRAPH_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <svg className="component-node__graph nodrag" viewBox="0 0 180 120">
            <path className="component-node__graph-grid" d="M45 0V120M90 0V120M135 0V120M0 30H180M0 60H180M0 90H180" />
            <polyline className="component-node__graph-line" points={points} />
            {graphType === "bezier" ? (
              <>
                <circle
                  className="component-node__graph-control"
                  cx="60"
                  cy={120 - controlY1 * 120}
                  onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateControl(event, "controlY1", false);
                  }}
                  onPointerUp={(event) => {
                    updateControl(event, "controlY1", true);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  r="5"
                />
                <circle
                  className="component-node__graph-control"
                  cx="120"
                  cy={120 - controlY2 * 120}
                  onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateControl(event, "controlY2", false);
                  }}
                  onPointerUp={(event) => {
                    updateControl(event, "controlY2", true);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  r="5"
                />
              </>
            ) : null}
          </svg>
          <div className="component-node__graph-domains nodrag">
            <span title={`${formatDomainValue(xMin)} : ${formatDomainValue(xMax)}`}>X</span>
            {domainInput("min", "xMin", xMin)}
            {domainInput("max", "xMax", xMax)}
            <span title={`${formatDomainValue(yMin)} : ${formatDomainValue(yMax)}`}>Y</span>
            {domainInput("min", "yMin", yMin)}
            {domainInput("max", "yMax", yMax)}
          </div>
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
