"use client";

import { useMemo, useState } from "react";

import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { NumberInput } from "@/components/atoms/NumberInput";
import { Select } from "@/components/atoms/Select";
import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { NodeForm, NodeFormRow } from "@/components/molecules/NodeForm";
import { Slider } from "@/components/molecules/Slider";
import { portTooltip, type ComponentNodeData } from "@/lib/graph/types";

type NumberSliderNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

type RoundingMode = "real" | "integer" | "even" | "odd";

const ROUNDING_OPTIONS = [
  { label: "Real", value: "real" },
  { label: "Integer", value: "integer" },
  { label: "Even", value: "even" },
  { label: "Odd", value: "odd" },
] satisfies Array<{ label: string; value: RoundingMode }>;

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function intValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function roundHalfAwayFromZero(value: number) {
  const magnitude = Math.floor(Math.abs(value) + 0.5);
  return value >= 0 ? magnitude : -magnitude;
}

function nearestParity(value: number, parity: 0 | 1) {
  const rounded = roundHalfAwayFromZero(value);
  if (Math.abs(rounded % 2) === parity) return rounded;
  const candidates = [rounded - 1, rounded + 1];
  return candidates.sort((left, right) => Math.abs(left - value) - Math.abs(right - value))[0] ?? rounded;
}

function applySliderSettings(value: number, settings: ReturnType<typeof sliderSettings>) {
  const lower = Math.min(settings.min, settings.max);
  const upper = Math.max(settings.min, settings.max);
  let nextValue = Math.min(Math.max(value, lower), upper);
  if (settings.rounding === "integer") nextValue = roundHalfAwayFromZero(nextValue);
  if (settings.rounding === "even") nextValue = nearestParity(nextValue, 0);
  if (settings.rounding === "odd") nextValue = nearestParity(nextValue, 1);
  if (settings.rounding === "real") nextValue = Number(nextValue.toFixed(settings.decimals));
  return Math.min(Math.max(nextValue, lower), upper);
}

function sliderSettings(data: ComponentNodeData) {
  const defaults = data.definition.settings_defaults ?? {};
  const settings = data.settings ?? {};
  const min = numberValue(settings.min, numberValue(defaults.min, 0));
  const max = numberValue(settings.max, numberValue(defaults.max, 1));
  const rounding =
    settings.rounding === "integer" || settings.rounding === "even" || settings.rounding === "odd" || settings.rounding === "real"
      ? settings.rounding
      : "real";
  return {
    value: numberValue(settings.value, numberValue(defaults.value, min <= max ? min : max)),
    min: Math.min(min, max),
    max: Math.max(min, max),
    decimals: Math.max(0, Math.min(intValue(settings.decimals, intValue(defaults.decimals, 2)), 12)),
    rounding,
  };
}

export function NumberSliderNode({ data, id, onContextMenu, title }: NumberSliderNodeProps) {
  const { definition } = data;
  const { requestRealtimeGeneration, setNodeSetting } = useGraphEditor();
  const [formOpen, setFormOpen] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const sliderConfig = useMemo(() => sliderSettings(data), [data]);
  const sliderValue = applySliderSettings(sliderConfig.value, sliderConfig);
  const sliderStep = sliderConfig.rounding === "real" ? 10 ** -sliderConfig.decimals : 1;
  const [draftValue, setDraftValue] = useState(String(sliderValue));
  const sliderSpan = Math.max(sliderConfig.max - sliderConfig.min, Number.EPSILON);
  const sliderRatio = (sliderValue - sliderConfig.min) / sliderSpan;
  const sliderLabelSide = sliderRatio > 0.5 ? "left" : "right";
  const outputName = definition.outputs[0]?.name ?? "value";
  const commitSetting = (key: string, value: unknown) => {
    setNodeSetting(id, key, value);
    requestRealtimeGeneration();
  };
  const commitValueDraft = () => {
    const parsed = Number(draftValue);
    commitSetting("value", Number.isFinite(parsed) ? applySliderSettings(parsed, sliderConfig) : sliderValue);
    setEditingValue(false);
  };

  return (
    <article
      className={`component-node component-node--number-slider${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--preset">
        <div className="component-node__center component-node__center--slider">
          <div
            className="component-node__title-wrap"
            onDoubleClick={(event) => {
              event.stopPropagation();
              setFormOpen(true);
            }}
          >
            <h3 className="component-node__title component-node__title--horizontal">{definition.component}</h3>
          </div>

          <div
            className="component-node__slider"
            onDoubleClick={(event) => {
              event.stopPropagation();
              setDraftValue(String(sliderValue));
              setEditingValue(true);
            }}
          >
            <span className="component-node__slider-value">{sliderValue.toFixed(sliderConfig.decimals)}</span>
            {editingValue ? (
              <NumberInput
                autoFocus
                className="component-node__slider-number-input nodrag nowheel"
                onBlur={commitValueDraft}
                onChange={(event) => setDraftValue(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setEditingValue(false);
                  }
                }}
                step={sliderStep}
                value={draftValue}
              />
            ) : (
              <Slider
                className="component-node__slider-input"
                labelSide={sliderLabelSide}
                max={sliderConfig.max}
                min={sliderConfig.min}
                onValueChange={(values) => setNodeSetting(id, "value", values[0] ?? sliderConfig.min)}
                onValueCommit={(values) => {
                  commitSetting("value", values[0] ?? sliderConfig.min);
                }}
                step={sliderStep}
                tickCount={11}
                value={[sliderValue]}
                valueLabel={sliderValue.toFixed(sliderConfig.decimals)}
              />
            )}
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
              label={output.name === outputName ? undefined : output.name}
              title={portTooltip(output)}
            />
          ))}
        </div>
      </div>
      {formOpen ? (
        <NodeForm onClose={() => setFormOpen(false)} title="Number Slider">
          <NodeFormRow label="Rounding">
            <Select ariaLabel="Slider rounding" onChange={(value) => commitSetting("rounding", value)} options={ROUNDING_OPTIONS} value={sliderConfig.rounding} />
          </NodeFormRow>
          <NodeFormRow label="Digits">
            <NumberInput className="node-form__input" min={0} max={12} onChange={(event) => commitSetting("decimals", Number(event.target.value))} step={1} value={sliderConfig.decimals} />
          </NodeFormRow>
          <NodeFormRow label="Min">
            <NumberInput className="node-form__input" onChange={(event) => commitSetting("min", Number(event.target.value))} step={sliderStep} value={sliderConfig.min} />
          </NodeFormRow>
          <NodeFormRow label="Max">
            <NumberInput className="node-form__input" onChange={(event) => commitSetting("max", Number(event.target.value))} step={sliderStep} value={sliderConfig.max} />
          </NodeFormRow>
        </NodeForm>
      ) : null}
    </article>
  );
}
