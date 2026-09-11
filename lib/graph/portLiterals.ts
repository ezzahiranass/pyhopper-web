import type { PyhopperComponentDefinition, PyhopperComponentPort } from "@/lib/graph/types";

/**
 * Inline literals — Grasshopper's "Set Data Item" on an unwired input.
 *
 * Any float / int / bool / str input that is not the variadic port may carry a
 * value in `node.values[<input>]`. The compiler passes it as a keyword literal
 * when the input has no wire; a wire always wins, and the literal stays in the
 * document for when the wire goes.
 */
export type LiteralType = "float" | "int" | "bool" | "string";

const PORT_LITERAL_TYPES: Record<string, LiteralType> = {
  float: "float",
  int: "int",
  bool: "bool",
  str: "string",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** The literal type of a port, or null when the port cannot take one. */
export function literalTypeOf(port: PyhopperComponentPort): LiteralType | null {
  return (port.type && PORT_LITERAL_TYPES[port.type]) || null;
}

/**
 * Whether `port` accepts an inline literal. The catalog says so with `literal: true`;
 * definitions from before the flag fall back to the same rule (primitive type, not
 * the variadic port).
 */
export function isLiteralCapableInput(definition: PyhopperComponentDefinition, port: PyhopperComponentPort): boolean {
  if (typeof port.literal === "boolean") {
    return port.literal;
  }
  const isVariadicPort = definition.variadic_inputs === true && definition.inputs[definition.inputs.length - 1]?.name === port.name;
  return literalTypeOf(port) !== null && !isVariadicPort;
}

/** Fit `value` to a literal type; `undefined` when it does not fit. */
export function coercePortLiteral(type: LiteralType, value: unknown): unknown {
  switch (type) {
    case "float":
      return isFiniteNumber(value) ? value : undefined;
    case "int":
      return isFiniteNumber(value) ? Math.trunc(value) : undefined;
    case "bool":
      return typeof value === "boolean" ? value : undefined;
    case "string":
      return typeof value === "string" ? value : undefined;
    default:
      return undefined;
  }
}

/** What a person typed, as a literal of `type`; `undefined` when it does not parse. */
export function parsePortLiteral(type: LiteralType, text: string): unknown {
  const trimmed = text.trim();
  switch (type) {
    case "float": {
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case "int": {
      if (!/^[+-]?\d+(\.0*)?$/.test(trimmed)) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
    }
    case "bool": {
      const lowered = trimmed.toLowerCase();
      if (["true", "yes", "1", "on"].includes(lowered)) return true;
      if (["false", "no", "0", "off"].includes(lowered)) return false;
      return undefined;
    }
    case "string":
      return text;
    default:
      return undefined;
  }
}

/** The pill text for a literal: numbers as typed, booleans as True/False, text quoted and clipped. */
export function formatPortLiteral(type: LiteralType, value: unknown): string {
  switch (type) {
    case "bool":
      return value === true ? "True" : "False";
    case "string": {
      const text = typeof value === "string" ? value : "";
      const clipped = text.length > 14 ? `${text.slice(0, 12)}…` : text;
      return `"${clipped}"`;
    }
    default:
      return isFiniteNumber(value) ? String(value) : "";
  }
}

/** The literals in `values` that fit a literal-capable input of `definition`, coerced. */
export function sanitizeInputLiterals(definition: PyhopperComponentDefinition, values: unknown): Record<string, unknown> {
  const source = values && typeof values === "object" && !Array.isArray(values) ? (values as Record<string, unknown>) : {};
  const result: Record<string, unknown> = {};
  for (const port of definition.inputs) {
    if (!(port.name in source) || !isLiteralCapableInput(definition, port)) continue;
    const type = literalTypeOf(port);
    if (!type) continue;
    const coerced = coercePortLiteral(type, source[port.name]);
    if (coerced !== undefined) {
      result[port.name] = coerced;
    }
  }
  return result;
}
