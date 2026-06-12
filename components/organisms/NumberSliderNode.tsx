"use client";

import { useMemo } from "react";

import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { Slider } from "@/components/molecules/Slider";
import { portTooltip, type ComponentNodeData } from "@/lib/graph/types";

type NumberSliderNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

export function NumberSliderNode({ data, id, onContextMenu, title }: NumberSliderNodeProps) {
  const { definition } = data;
  const { requestRealtimeGeneration, setNodeValue } = useGraphEditor();
  const sliderConfig = useMemo(() => {
    const config = definition.frontend_config ?? {};
    const min = typeof config.min === "number" ? config.min : 0;
    const max = typeof config.max === "number" ? config.max : 1;
    const step = typeof config.step === "number" ? config.step : 0.01;
    const decimals = typeof config.decimals === "number" ? config.decimals : 2;
    const fallbackValue = min <= max ? min : max;
    const value = typeof config.value === "number" ? config.value : fallbackValue;

    return { min, max, step, decimals, value };
  }, [definition.frontend_config]);
  const sliderValueKey = definition.outputs[0]?.name ?? "value";
  const sliderValue =
    typeof data.values[sliderValueKey] === "number" ? data.values[sliderValueKey] : sliderConfig.value;
  const sliderSpan = Math.max(sliderConfig.max - sliderConfig.min, Number.EPSILON);
  const sliderRatio = (sliderValue - sliderConfig.min) / sliderSpan;
  const sliderLabelSide = sliderRatio > 0.5 ? "left" : "right";

  return (
    <article
      className={`component-node component-node--number-slider${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--preset">
        <div className="component-node__center component-node__center--slider">
          <div className="component-node__title-wrap">
            <h3 className="component-node__title component-node__title--horizontal">{definition.component}</h3>
          </div>

          <div className="component-node__slider">
            <span className="component-node__slider-value">{sliderValue.toFixed(sliderConfig.decimals)}</span>
            <Slider
              className="component-node__slider-input"
              labelSide={sliderLabelSide}
              max={sliderConfig.max}
              min={sliderConfig.min}
              onValueChange={(values) => setNodeValue(id, sliderValueKey, values[0] ?? sliderConfig.min)}
              onValueCommit={(values) => {
                setNodeValue(id, sliderValueKey, values[0] ?? sliderConfig.min);
                requestRealtimeGeneration();
              }}
              step={sliderConfig.step}
              tickCount={11}
              value={[sliderValue]}
              valueLabel={sliderValue.toFixed(sliderConfig.decimals)}
            />
          </div>
        </div>

        <div className="component-node__ports component-node__ports--right">
          {definition.outputs.map((output, index) => (
            <GraphPortRow
              handleClassName="component-node__handle component-node__handle--source"
              handleId={output.name}
              handleStyle={{ top: 18 + index * 18 }}
              key={`output-${output.name}`}
              kind="output"
              title={portTooltip(output)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}