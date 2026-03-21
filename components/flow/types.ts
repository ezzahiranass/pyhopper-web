export type PyhopperComponentPort = {
  name: string;
  type: string | null;
  access?: string;
  default?: unknown;
  optional?: boolean;
};

export type PyhopperComponentDefinition = {
  component_key: string;
  tab: string;
  category: string;
  component: string;
  description: string;
  frontend_preset?: string | null;
  frontend_config?: {
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    value?: number;
  } | null;
  input_count: number;
  output_count: number;
  variadic_inputs?: boolean;
  inputs: PyhopperComponentPort[];
  outputs: PyhopperComponentPort[];
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
  values: Record<string, unknown>;
};

export type GraphViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type GraphNode = {
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
  values: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
};

export type GraphDocument = {
  schemaVersion: 1;
  graphId: string;
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

export type RenderManifestObject = {
  objectName: string;
  nodeId: string;
};

export type RenderManifest = {
  graphId: string;
  objects: RenderManifestObject[];
};
