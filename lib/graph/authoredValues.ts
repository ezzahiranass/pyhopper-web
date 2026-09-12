import type { PyhopperComponentDefinition, PyhopperComponentSetting } from "@/lib/graph/types";

/**
 * Declarative authored values.
 *
 * A component declares what a person authors on its node: `authored_values`
 * (per-node values the compiler bakes into source: a toggle's state, a
 * panel's text) and `settings_schema` (call-time settings: a slider's
 * range). Both use the same spec shape, so one set of helpers reads them,
 * fills defaults and sanitises stored data against them.
 */
export type AuthoredSchema = Record<string, PyhopperComponentSetting>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** The component's authored-value schema; `null` when the definition predates the catalog exposing it. */
export function authoredSchema(definition: PyhopperComponentDefinition): AuthoredSchema | null {
  return isRecord(definition.authored_values) ? (definition.authored_values as AuthoredSchema) : null;
}

/** The component's settings schema; `null` when the definition predates the catalog exposing it. */
export function settingsSchema(definition: PyhopperComponentDefinition): AuthoredSchema | null {
  return isRecord(definition.settings_schema) ? (definition.settings_schema as AuthoredSchema) : null;
}

export function schemaDefaults(schema: AuthoredSchema | null): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema ?? {})) {
    if (isRecord(spec) && "default" in spec) {
      defaults[key] = spec.default;
    }
  }
  return defaults;
}

export function authoredDefaults(definition: PyhopperComponentDefinition): Record<string, unknown> {
  return schemaDefaults(authoredSchema(definition));
}

export function hasAuthoredValues(definition: PyhopperComponentDefinition): boolean {
  return Object.keys(authoredSchema(definition) ?? {}).length > 0;
}

/** The label shown for a spec: its declared label, else the key spelled out ("xMin" → "X min"). */
export function specLabel(key: string, spec: PyhopperComponentSetting): string {
  if (spec.label) return spec.label;
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function clamp(value: number, spec: PyhopperComponentSetting): number {
  let next = value;
  if (isFiniteNumber(spec.min)) next = Math.max(next, spec.min);
  if (isFiniteNumber(spec.max)) next = Math.min(next, spec.max);
  return next;
}

/** `value` brought in line with `spec`, or `undefined` when it cannot be. */
export function sanitizeSchemaValue(spec: PyhopperComponentSetting, value: unknown): unknown {
  switch (spec.type) {
    case "float":
      return isFiniteNumber(value) ? clamp(value, spec) : undefined;
    case "int":
      return isFiniteNumber(value) ? clamp(Math.trunc(value), spec) : undefined;
    case "bool":
      return typeof value === "boolean" ? value : undefined;
    case "string":
      return typeof value === "string" ? value : undefined;
    case "choice":
      return typeof value === "string" && (spec.choices ?? []).includes(value) ? value : undefined;
    case "list":
      return Array.isArray(value) ? value : undefined;
    default:
      return undefined;
  }
}

/**
 * Stored data reconciled with a schema: every declared key present (the stored
 * value when it fits the spec, else the default), unknown keys dropped.
 */
export function sanitizeAgainstSchema(schema: AuthoredSchema, raw: unknown): Record<string, unknown> {
  const source = isRecord(raw) ? raw : {};
  const result: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema)) {
    if (!isRecord(spec)) continue;
    const sanitized = sanitizeSchemaValue(spec, source[key]);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    } else if ("default" in spec) {
      result[key] = spec.default;
    }
  }
  return result;
}

/**
 * A node's `values` reconciled with its component's authored schema. Definitions
 * from before the catalog exposed schemas pass values through untouched — the
 * canvas re-sanitises once the live catalog swaps the definition in.
 */
export function sanitizeAuthoredValues(definition: PyhopperComponentDefinition, values: unknown): Record<string, unknown> {
  const schema = authoredSchema(definition);
  if (!schema) {
    return isRecord(values) ? { ...values } : {};
  }
  return sanitizeAgainstSchema(schema, values);
}
