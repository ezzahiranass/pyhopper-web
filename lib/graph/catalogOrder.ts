import { componentDisplayName, type PyhopperComponentDefinition } from "@/lib/graph/types";

/** Grasshopper's ribbon order. Tabs and categories pyhopper adds on its own sort after these, alphabetically. */
export const TAB_ORDER = ["Params", "Maths", "Sets", "Vector", "Curve", "Surface", "Mesh", "Intersect", "Transform", "Display"];

export const CATEGORY_ORDER: Record<string, string[]> = {
  Params: ["Geometry", "Primitive", "Input", "Util"],
  Maths: ["Domain", "Matrix", "Operators", "Polynomials", "Script", "Time", "Trig", "Util"],
  Sets: ["List", "Sequence", "Sets", "Text", "Tree"],
  Vector: ["Field", "Grid", "Plane", "Point", "Vector"],
  Curve: ["Analysis", "Division", "Primitive", "Spline", "Util"],
  Surface: ["Analysis", "Freeform", "Primitive", "SubD", "Util"],
  Mesh: ["Analysis", "Primitive", "Triangulation", "Util"],
  Intersect: ["Mathematical", "Physical", "Shape"],
  // pyhopper's folder keeps Grasshopper's historical spelling of Euclidean
  Transform: ["Affine", "Array", "Euclidian", "Euclidean", "Morph", "Util"],
  Display: ["Colour", "Dimensions", "Graphs", "Preview", "Vector"],
};

function rank(order: readonly string[], value: string): number {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

export function compareTabs(a: string, b: string): number {
  return rank(TAB_ORDER, a) - rank(TAB_ORDER, b) || a.localeCompare(b);
}

export function compareCategories(tab: string, a: string, b: string): number {
  const order = CATEGORY_ORDER[tab] ?? [];
  return rank(order, a) - rank(order, b) || a.localeCompare(b);
}

export function compareComponents(a: PyhopperComponentDefinition, b: PyhopperComponentDefinition): number {
  return componentDisplayName(a).localeCompare(componentDisplayName(b)) || a.component.localeCompare(b.component);
}

export function sortedTabs(components: readonly PyhopperComponentDefinition[]): string[] {
  return Array.from(new Set(components.map((definition) => definition.tab))).sort(compareTabs);
}
