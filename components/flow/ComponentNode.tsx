"use client";

import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { ComponentNodeData } from "@/components/flow/types";
import { Slider } from "@/components/ui/slider";

export function ComponentNode({ data }: NodeProps) {
  const typedData = data as ComponentNodeData;
  const { definition } = typedData;
  const inputLabel = (name: string, index: number) =>
    definition.variadic_inputs && index === definition.inputs.length - 1 ? `${name}...` : name;
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
  const [sliderValue, setSliderValue] = useState(sliderConfig.value);
  const sliderSpan = Math.max(sliderConfig.max - sliderConfig.min, Number.EPSILON);
  const sliderRatio = (sliderValue - sliderConfig.min) / sliderSpan;
  const sliderLabelSide = sliderRatio > 0.5 ? "left" : "right";

  if (definition.frontend_preset === "number-slider") {
    return (
      <article className="component-node component-node--number-slider">
        <div className="component-node__body component-node__body--preset">
          <div className="component-node__center component-node__center--slider">
            <div className="component-node__title-wrap">
              <h3 className="component-node__title component-node__title--horizontal">{definition.component}</h3>
            </div>

            <div className="component-node__slider">
              <span className="component-node__slider-value">
                {sliderValue.toFixed(sliderConfig.decimals)}
              </span>
              <Slider
                className="component-node__slider-input"
                labelSide={sliderLabelSide}
                max={sliderConfig.max}
                min={sliderConfig.min}
                onValueChange={(values) => setSliderValue(values[0] ?? sliderConfig.min)}
                step={sliderConfig.step}
                tickCount={11}
                value={[sliderValue]}
                valueLabel={sliderValue.toFixed(sliderConfig.decimals)}
              />
            </div>
          </div>

          <div className="component-node__ports component-node__ports--right">
            {definition.outputs.map((output, index) => (
              <div className="component-node__port-row component-node__port-row--output" key={`output-${output.name}`}>
                <Handle
                  className="component-node__handle component-node__handle--source"
                  id={`output-${output.name}`}
                  position={Position.Right}
                  style={{ top: 18 + index * 18 }}
                  type="source"
                />
              </div>
            ))}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="component-node">
      <div className="component-node__body component-node__body--row">
        <div className="component-node__ports component-node__ports--left">
          {definition.inputs.map((input, index) => (
            <div className="component-node__port-row component-node__port-row--input" key={`input-${input.name}`}>
              <Handle
                className="component-node__handle component-node__handle--target"
                id={`input-${input.name}`}
                position={Position.Left}
                type="target"
              />
              <p className="component-node__port-name">{inputLabel(input.name, index)}</p>
            </div>
          ))}
        </div>

        <div className="component-node__center">
          <div className="component-node__title-wrap">
            <h3 className="component-node__title">{definition.component}</h3>
          </div>
        </div>

        <div className="component-node__ports component-node__ports--right">
          {definition.outputs.map((output) => (
            <div className="component-node__port-row component-node__port-row--output" key={`output-${output.name}`}>
              <p className="component-node__port-name">{output.name}</p>
              <Handle
                className="component-node__handle component-node__handle--source"
                id={`output-${output.name}`}
                position={Position.Right}
                type="source"
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
