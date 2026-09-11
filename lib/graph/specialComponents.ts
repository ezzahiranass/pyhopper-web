import type { PyhopperComponentDefinition } from "@/lib/graph/types";

/**
 * Components the frontend treats specially (custom node bodies, authored values, search shortcuts),
 * addressed by their catalog `component_key` — class names alone can repeat across tabs
 * (Params › Geometry › Arc vs Curve › Primitive › Arc).
 */
export const SPECIAL_COMPONENT_KEYS = {
  booleanToggle: "pyhopper.Components.Params.Input.BooleanToggle.BooleanToggle",
  graphMapper: "pyhopper.Components.Params.Input.GraphMapper.GraphMapper",
  mdSlider: "pyhopper.Components.Params.Input.MDSlider.MDSlider",
  numberSlider: "pyhopper.Components.Params.Input.NumberSlider.NumberSlider",
  objectReference: "pyhopper.scene.ObjectReference",
  panel: "pyhopper.Components.Params.Input.Panel.Panel",
  pointOnCurve: "pyhopper.Components.Curve.Analysis.PointOnCurve.PointOnCurve",
} as const;

export type SpecialComponent = keyof typeof SPECIAL_COMPONENT_KEYS;

/** Legacy stored definitions may predate `component_key`; fall back to the class name for them. */
const LEGACY_CLASS_NAMES: Record<SpecialComponent, string> = {
  booleanToggle: "booleantoggle",
  graphMapper: "graphmapper",
  mdSlider: "mdslider",
  numberSlider: "numberslider",
  objectReference: "objectreference",
  panel: "panel",
  pointOnCurve: "pointoncurve",
};

function normalizeComponentName(name: string) {
  return name.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

export function isSpecialComponent(definition: PyhopperComponentDefinition, which: SpecialComponent): boolean {
  if (definition.component_key) {
    return definition.component_key === SPECIAL_COMPONENT_KEYS[which];
  }
  return normalizeComponentName(definition.component) === LEGACY_CLASS_NAMES[which];
}

export function specialComponentOf(definition: PyhopperComponentDefinition): SpecialComponent | null {
  for (const which of Object.keys(SPECIAL_COMPONENT_KEYS) as SpecialComponent[]) {
    if (isSpecialComponent(definition, which)) {
      return which;
    }
  }
  return null;
}
