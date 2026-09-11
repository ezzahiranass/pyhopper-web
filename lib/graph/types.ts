export type PortOperation = "Graft" | "Simplify" | "Flatten" | "Reverse" | "Reparametrize";

export function portTooltip(port: PyhopperComponentPort): string {
  return [
    `${port.name}: ${port.type ?? "any"}`,
    port.accepts?.length ? `accepts: ${port.accepts.join(", ")}` : null,
    port.optional ? "(optional)" : null,
    port.default !== undefined ? `default: ${JSON.stringify(port.default)}` : null,
    port.access ? `access: ${port.access}` : null,
  ]
    .filter(Boolean)
    .join("  ");
}

/** The name shown to people: Grasshopper's display name when the catalog carries it, else the class name. */
export function componentDisplayName(definition: PyhopperComponentDefinition): string {
  return definition.display_name?.trim() || definition.component;
}

/** Grasshopper's short nickname ("Divide", "LLX"); null when the catalog has none or it repeats the display name. */
export function componentNickname(definition: PyhopperComponentDefinition): string | null {
  const nickname = definition.nickname?.trim();
  if (!nickname || nickname === componentDisplayName(definition)) {
    return null;
  }
  return nickname;
}

export function nodeTooltip(definition: PyhopperComponentDefinition): string {
  const nickname = componentNickname(definition);
  return [
    `${definition.tab} > ${definition.category} > ${componentDisplayName(definition)}${nickname ? ` (${nickname})` : ""}`,
    definition.description,
    `${definition.variadic_inputs ? `${definition.input_count}+` : definition.input_count} in / ${definition.output_count} out`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type PyhopperComponentPort = {
  name: string;
  type: string | null;
  accepts?: string[] | null;
  access?: string;
  default?: unknown;
  optional?: boolean;
};

export type PyhopperComponentDefinition = {
  component_key: string;
  /** Python module path (`pyhopper.Components.Curve.Division.DivideCurve`). */
  module?: string;
  tab: string;
  category: string;
  /** Class name — the stable identity used by node ids, the special-node registry and the compiler. */
  component: string;
  /** Grasshopper display name ("Divide Curve"); read it through componentDisplayName(). */
  display_name?: string;
  /** Grasshopper nickname ("Divide"). */
  nickname?: string;
  gh_guid?: string | null;
  description: string;
  settings_schema?: Record<string, PyhopperComponentSetting>;
  settings_defaults?: Record<string, unknown>;
  initial_settings?: Record<string, unknown>;
  initial_values?: Record<string, unknown>;
  input_count: number;
  output_count: number;
  variadic_inputs?: boolean;
  inputs: PyhopperComponentPort[];
  outputs: PyhopperComponentPort[];
};

export type PyhopperComponentSetting = {
  choices?: string[];
  default?: unknown;
  label?: string;
  max?: number;
  min?: number;
  type: "bool" | "choice" | "float" | "int" | "string";
};

export type DataTreePreviewItem = {
  index: number;
  value: string;
};

export type DataTreePreviewBranch = {
  path: string;
  items: DataTreePreviewItem[];
};

export type NodePreviewValue =
  | {
      kind: "data-tree";
      branch_count: number;
      item_count: number;
      branches: DataTreePreviewBranch[];
    }
  | {
      kind: "value";
      value: string;
    };

export type ComponentNodeData = {
  definition: PyhopperComponentDefinition;
  previewEnabled: boolean;
  previews: Record<string, NodePreviewValue>;
  settings: Record<string, unknown>;
  values: Record<string, unknown>;
  portOperations: Record<string, PortOperation>;
};

export type GraphMapperType = "linear" | "bezier" | "sine" | "gaussian";
export type PanelTextAlignment = "left" | "center" | "right";

export const OBJECT_REFERENCE_DEFINITION: PyhopperComponentDefinition = {
  component_key: "pyhopper.scene.ObjectReference",
  tab: "Params",
  category: "Scene",
  component: "Object Reference",
  description: "Reference a durable authored scene object by id.",
  input_count: 0,
  output_count: 1,
  inputs: [],
  outputs: [{ name: "geometry", type: null }],
};

export const BUILTIN_GRAPH_NODE_DEFINITIONS: PyhopperComponentDefinition[] = [
  OBJECT_REFERENCE_DEFINITION,
];

export type GraphViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type ComponentGraphNode = {
  id: string;
  kind: "component";
  componentKey: string;
  component: {
    tab: string;
    category: string;
    name: string;
  };
  position: {
    x: number;
    y: number;
  };
  previewEnabled: boolean;
  settings?: Record<string, unknown>;
  values: Record<string, unknown>;
  portOperations: Record<string, PortOperation>;
};

export type ObjectReferenceGraphNode = {
  id: string;
  kind: "object-reference";
  objectId: string;
  position: {
    x: number;
    y: number;
  };
  previewEnabled: boolean;
  portOperations: Record<string, PortOperation>;
};

export type GraphNode = ComponentGraphNode | ObjectReferenceGraphNode;

export type GraphEdge = {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
};

export type GraphDocument = {
  schemaVersion: 2;
  graphId: string;
  scene: import("@/lib/scene/types").SceneDocument;
  viewport: GraphViewport;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphExportResponse = {
  graphId: string;
  schemaVersion: number;
  filename: string;
  path: string;
  size: number;
  glb_url: string;
  node_previews: Record<string, NodePreviewValue>;
  python_source: string;
  render_manifest: RenderManifest;
};

export type ImportedGraphFlow = {
  nodes: Array<{
    id: string;
    type?: string;
    position: {
      x: number;
      y: number;
    };
    data: ComponentNodeData;
    selected?: boolean;
    style?: {
      width?: number;
      height?: number;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    sourceHandle?: string;
    target: string;
    targetHandle?: string;
    animated?: boolean;
    className?: string;
    type?: string;
    selected?: boolean;
  }>;
  viewport: GraphViewport;
};

export type GraphImportResponse = {
  graphId: string;
  schemaVersion: 2;
  flow: ImportedGraphFlow;
  glb_url: string;
  python_source: string;
  render_manifest: RenderManifest;
  definition_source: string;
};

export type RenderManifestObject = {
  objectName: string;
  nodeId: string;
};

export type RenderManifest = {
  graphId: string;
  objects: RenderManifestObject[];
};
