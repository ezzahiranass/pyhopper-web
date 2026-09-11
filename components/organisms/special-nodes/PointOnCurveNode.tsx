"use client";

import { useMemo } from "react";

import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { Slider } from "@/components/molecules/Slider";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { componentDisplayName, portTooltip, type ComponentNodeData } from "@/lib/graph/types";

type PointOnCurveNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

const PORT_OP_INITIAL: Record<string, string> = {
  Graft: "G",
  Simplify: "S",
  Flatten: "F",
  Reverse: "R",
  Reparametrize: "P",
};

function handlePortContextMenu(
  event: React.MouseEvent<HTMLElement>,
  nodeId: string,
  portName: string,
  portKind: "input" | "output",
) {
  event.preventDefault();
  event.stopPropagation();
  window.dispatchEvent(
    new CustomEvent("pyhopper-port-contextmenu", {
      detail: {
        nodeId,
        portName,
        portKind,
        clientX: event.clientX,
        clientY: event.clientY,
      },
    }),
  );
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function PointOnCurveNode({ data, id, onContextMenu, title }: PointOnCurveNodeProps) {
  const { definition } = data;
  const { requestRealtimeGeneration, setNodeValue } = useGraphEditor();
  const input = definition.inputs[0];
  const output = definition.outputs[0];
  const sliderConfig = useMemo(() => {
    return {
      min: 0,
      max: 1,
      step: 0.001,
      decimals: 3,
      value: 0.5,
    };
  }, []);
  const parameter = numberValue(data.values.parameter, sliderConfig.value);
  const sliderSpan = Math.max(sliderConfig.max - sliderConfig.min, Number.EPSILON);
  const sliderRatio = (parameter - sliderConfig.min) / sliderSpan;
  const sliderLabelSide = sliderRatio > 0.5 ? "left" : "right";

  return (
    <article
      className={`component-node component-node--point-on-curve${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--point-on-curve">
        <div className="component-node__ports component-node__ports--left">
          <GraphPortRow
            badge={data.portOperations[`input:${input.name}`] ? PORT_OP_INITIAL[data.portOperations[`input:${input.name}`]] : undefined}
            handleClassName="component-node__handle component-node__handle--target"
            handleId={input.name}
            kind="input"
            onContextMenu={(event) => handlePortContextMenu(event, id, input.name, "input")}
            title={portTooltip(input)}
          />
        </div>

        <div className="component-node__center component-node__center--slider">
          <div className="component-node__title-wrap">
            <h3 className="component-node__title component-node__title--horizontal">{componentDisplayName(definition)}</h3>
          </div>

          <div className="component-node__slider">
            <Slider
              className="component-node__slider-input"
              labelSide={sliderLabelSide}
              max={sliderConfig.max}
              min={sliderConfig.min}
              onValueChange={(values) => setNodeValue(id, "parameter", values[0] ?? sliderConfig.min)}
              onValueCommit={(values) => {
                setNodeValue(id, "parameter", values[0] ?? sliderConfig.min);
                requestRealtimeGeneration();
              }}
              step={sliderConfig.step}
              tickCount={11}
              value={[parameter]}
              valueLabel={parameter.toFixed(sliderConfig.decimals)}
            />
          </div>
        </div>

        <div className="component-node__ports component-node__ports--right">
          <GraphPortRow
            badge={data.portOperations[`output:${output.name}`] ? PORT_OP_INITIAL[data.portOperations[`output:${output.name}`]] : undefined}
            handleClassName="component-node__handle component-node__handle--source"
            handleId={output.name}
            kind="output"
            onContextMenu={(event) => handlePortContextMenu(event, id, output.name, "output")}
            title={portTooltip(output)}
          />
        </div>
      </div>
    </article>
  );
}
