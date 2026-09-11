"use client";

import { useState } from "react";

import { NumberInput } from "@/components/atoms/NumberInput";
import { Select } from "@/components/atoms/Select";
import { Switch } from "@/components/atoms/Switch";
import { NodeForm, NodeFormRow } from "@/components/molecules/NodeForm";
import { authoredSchema, sanitizeSchemaValue, specLabel } from "@/lib/graph/authoredValues";
import { componentDisplayName, type PyhopperComponentDefinition, type PyhopperComponentSetting } from "@/lib/graph/types";

type AuthoredValuesFormProps = {
  definition: PyhopperComponentDefinition;
  onChange: (key: string, value: unknown) => void;
  onClose: () => void;
  values: Record<string, unknown>;
};

type NumberFieldProps = {
  onCommit: (value: number) => void;
  spec: PyhopperComponentSetting;
  value: unknown;
};

/** A number field that commits on blur / Enter so half-typed values never reach the graph. */
function NumberField({ onCommit, spec, value }: NumberFieldProps) {
  const current = typeof value === "number" && Number.isFinite(value) ? value : typeof spec.default === "number" ? spec.default : 0;
  const [draft, setDraft] = useState(String(current));
  const [editing, setEditing] = useState(false);
  const commit = () => {
    const parsed = Number(draft);
    const sanitized = sanitizeSchemaValue(spec, parsed);
    if (typeof sanitized === "number" && sanitized !== current) {
      onCommit(sanitized);
    }
    setEditing(false);
  };

  return (
    <NumberInput
      className="node-form__input"
      max={spec.max}
      min={spec.min}
      onBlur={commit}
      onChange={(event) => {
        setEditing(true);
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      step={spec.type === "int" ? 1 : "any"}
      value={editing ? draft : String(current)}
    />
  );
}

/**
 * Generic editor for a node's authored values, driven entirely by the
 * component's declared schema: numbers, switches, choices and text.
 */
export function AuthoredValuesForm({ definition, onChange, onClose, values }: AuthoredValuesFormProps) {
  const schema = authoredSchema(definition) ?? {};

  return (
    <NodeForm onClose={onClose} title={componentDisplayName(definition)}>
      {Object.entries(schema).map(([key, spec]) => {
        const label = specLabel(key, spec);
        const value = values[key];
        switch (spec.type) {
          case "float":
          case "int":
            return (
              <NodeFormRow key={key} label={label}>
                <NumberField onCommit={(next) => onChange(key, next)} spec={spec} value={value} />
              </NodeFormRow>
            );
          case "bool":
            return (
              <NodeFormRow key={key} label={label}>
                <Switch checked={value === true} onCheckedChange={(checked) => onChange(key, checked)} />
              </NodeFormRow>
            );
          case "choice":
            return (
              <NodeFormRow key={key} label={label}>
                <Select
                  ariaLabel={label}
                  onChange={(next) => onChange(key, next)}
                  options={(spec.choices ?? []).map((choice) => ({ label: choice, value: choice }))}
                  value={typeof value === "string" ? value : String(spec.default ?? "")}
                />
              </NodeFormRow>
            );
          case "string":
            return (
              <NodeFormRow key={key} label={label}>
                <textarea
                  className="node-form__input node-form__textarea"
                  onChange={(event) => onChange(key, event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  rows={2}
                  value={typeof value === "string" ? value : ""}
                />
              </NodeFormRow>
            );
          default:
            return null; // list values are edited on the node itself
        }
      })}
    </NodeForm>
  );
}
