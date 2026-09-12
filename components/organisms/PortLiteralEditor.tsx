"use client";

import { useState } from "react";

import { NumberInput } from "@/components/atoms/NumberInput";
import { Switch } from "@/components/atoms/Switch";
import { NodeForm, NodeFormRow } from "@/components/molecules/NodeForm";
import { coercePortLiteral, literalTypeOf, parsePortLiteral } from "@/lib/graph/portLiterals";
import type { PyhopperComponentPort } from "@/lib/graph/types";

type PortLiteralEditorProps = {
  /** True while a wire feeds the port — the literal is kept but the wire wins. */
  isWired: boolean;
  onChange: (value: unknown) => void;
  onClear: () => void;
  onClose: () => void;
  port: PyhopperComponentPort;
  value: unknown;
};

/**
 * One field for one input port: the inline literal the compiler passes when the
 * port has no wire. Numbers and text commit on blur / Enter; Escape closes.
 */
export function PortLiteralEditor({ isWired, onChange, onClear, onClose, port, value }: PortLiteralEditorProps) {
  const type = literalTypeOf(port);
  const current = type ? coercePortLiteral(type, value) : undefined;
  const fallbackText = current !== undefined ? String(current) : port.default !== undefined && port.default !== null ? String(port.default) : "";
  const [draft, setDraft] = useState(fallbackText);

  if (!type) {
    return null;
  }

  const commitDraft = () => {
    const parsed = parsePortLiteral(type, draft);
    if (parsed !== undefined && parsed !== current) {
      onChange(parsed);
    }
  };
  const keyHandler = (event: React.KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Enter" && type !== "string") {
      event.preventDefault();
      event.currentTarget.blur();
      onClose();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <NodeForm onClose={onClose} title={`${port.name} value`}>
      <NodeFormRow label={type === "int" ? "Integer" : type === "float" ? "Number" : type === "bool" ? "Boolean" : "Text"}>
        {type === "bool" ? (
          <Switch checked={current === true} onCheckedChange={(checked) => onChange(checked)} />
        ) : type === "string" ? (
          <textarea
            autoFocus
            className="node-form__input node-form__textarea"
            onBlur={commitDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={keyHandler}
            rows={2}
            value={draft}
          />
        ) : (
          <NumberInput
            autoFocus
            className="node-form__input"
            onBlur={commitDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={keyHandler}
            step={type === "int" ? 1 : "any"}
            value={draft}
          />
        )}
      </NodeFormRow>
      <p className="node-form__hint">
        {isWired
          ? "A wire feeds this input; the literal applies once the wire is removed."
          : current !== undefined
            ? "Passed to the component in place of a wire."
            : "Type a value to pass it to the component without a wire."}
      </p>
      {current !== undefined ? (
        <button className="node-form__action" onClick={onClear} type="button">
          Clear value
        </button>
      ) : null}
    </NodeForm>
  );
}
