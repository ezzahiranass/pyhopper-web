"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";

import type {
  ComponentNodeData,
  GraphDocument,
  GraphEdge,
  GraphExportResponse,
  GraphNode,
  GraphViewport,
  PyhopperComponentDefinition,
  RenderManifest,
} from "@/components/flow/types";

const GRAPH_SNAPSHOT_SCHEMA_VERSION = 1;
const GRAPH_SNAPSHOT_STORAGE_KEY = "pyhopper.graph.snapshot.v1";
const GRAPH_EXPORT_STORAGE_KEY = "pyhopper.graph.export.v1";
const GRAPH_SETTINGS_STORAGE_KEY = "pyhopper.graph.settings.v1";
const GRAPH_SELECTION_STORAGE_KEY = "pyhopper.graph.selection.v1";
const DEFAULT_VIEWPORT: GraphViewport = { x: 0, y: 0, zoom: 1 };
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

type StoredGraphSnapshot = {
  schemaVersion: 1;
  graphId: string;
  flow: {
    nodes: Node<ComponentNodeData>[];
    edges: Edge[];
    viewport: GraphViewport;
  };
};

type StoredGraphExport = {
  schemaVersion: 1;
  graphId: string;
  modelUrl: string;
  generatedPython: string | null;
  renderManifest: RenderManifest | null;
};

type StoredGraphSettings = {
  schemaVersion: 1;
  realtimeGenerationEnabled: boolean;
};

type StoredGraphSelection = {
  schemaVersion: 1;
  graphId: string;
  nodeIds: string[];
};

type GraphEditorContextValue = {
  edges: Edge[];
  exportError: string | null;
  generatedPython: string | null;
  graphDocument: GraphDocument;
  graphId: string;
  hasStoredSnapshot: boolean;
  isExporting: boolean;
  isHydrated: boolean;
  modelUrl: string | null;
  nodes: Node<ComponentNodeData>[];
  realtimeGenerationEnabled: boolean;
  renderManifest: RenderManifest | null;
  selectedNodeIds: string[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setNodes: Dispatch<SetStateAction<Node<ComponentNodeData>[]>>;
  setNodePreviewEnabled: (nodeId: string, enabled: boolean) => void;
  setNodeValue: (nodeId: string, valueKey: string, value: unknown) => void;
  setRealtimeGenerationEnabled: (enabled: boolean) => void;
  setViewport: (viewport: GraphViewport) => void;
  viewport: GraphViewport;
  exportGraph: () => Promise<void>;
  requestRealtimeGeneration: () => void;
};

const GraphEditorContext = createContext<GraphEditorContextValue | null>(null);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultSliderValue(definition: PyhopperComponentDefinition): number | null {
  if (definition.frontend_preset !== "number-slider") {
    return null;
  }

  const config = definition.frontend_config ?? {};
  const min = isFiniteNumber(config.min) ? config.min : 0;
  const max = isFiniteNumber(config.max) ? config.max : 1;
  const fallbackValue = min <= max ? min : max;
  return isFiniteNumber(config.value) ? config.value : fallbackValue;
}

function sanitizeNodeValues(
  definition: PyhopperComponentDefinition,
  values: unknown,
): Record<string, unknown> {
  const nextValues =
    values && typeof values === "object" && !Array.isArray(values)
      ? { ...(values as Record<string, unknown>) }
      : {};

  if (definition.frontend_preset === "number-slider") {
    const primaryOutput = definition.outputs[0]?.name ?? "value";
    const sliderValue = nextValues[primaryOutput];
    const fallbackValue = defaultSliderValue(definition);

    return {
      [primaryOutput]:
        isFiniteNumber(sliderValue) && fallbackValue !== null ? sliderValue : fallbackValue ?? 0,
    };
  }

  return nextValues;
}

function sanitizeStoredNode(node: Node<ComponentNodeData>): Node<ComponentNodeData> {
  return {
    id: node.id,
    type: node.type ?? "component",
    position: node.position,
    data: {
      definition: node.data.definition,
      previewEnabled: typeof node.data.previewEnabled === "boolean" ? node.data.previewEnabled : true,
      values: sanitizeNodeValues(node.data.definition, node.data.values),
    },
    selected: false,
  };
}

function sanitizeStoredEdge(edge: Edge): Edge {
  return {
    ...edge,
    selected: false,
  };
}

function parseStoredSnapshot(rawValue: string | null): StoredGraphSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGraphSnapshot;
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION) {
      return null;
    }
    if (typeof parsed.graphId !== "string" || !parsed.graphId) {
      return null;
    }
    if (!parsed.flow || !Array.isArray(parsed.flow.nodes) || !Array.isArray(parsed.flow.edges)) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId: parsed.graphId,
      flow: {
        nodes: parsed.flow.nodes.map((node) => sanitizeStoredNode(node)),
        edges: parsed.flow.edges.map((edge) => sanitizeStoredEdge(edge)),
        viewport:
          parsed.flow.viewport &&
          isFiniteNumber(parsed.flow.viewport.x) &&
          isFiniteNumber(parsed.flow.viewport.y) &&
          isFiniteNumber(parsed.flow.viewport.zoom)
            ? parsed.flow.viewport
            : DEFAULT_VIEWPORT,
      },
    };
  } catch {
    return null;
  }
}

function parseStoredGraphExport(rawValue: string | null): StoredGraphExport | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGraphExport;
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION) {
      return null;
    }
    if (typeof parsed.graphId !== "string" || !parsed.graphId) {
      return null;
    }
    if (typeof parsed.modelUrl !== "string" || !parsed.modelUrl) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId: parsed.graphId,
      modelUrl: parsed.modelUrl,
      generatedPython: typeof parsed.generatedPython === "string" ? parsed.generatedPython : null,
      renderManifest:
        parsed.renderManifest &&
        typeof parsed.renderManifest === "object" &&
        typeof parsed.renderManifest.graphId === "string" &&
        Array.isArray(parsed.renderManifest.objects)
          ? parsed.renderManifest
          : null,
    };
  } catch {
    return null;
  }
}

function parseStoredGraphSettings(rawValue: string | null): StoredGraphSettings | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGraphSettings;
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION) {
      return null;
    }
    if (typeof parsed.realtimeGenerationEnabled !== "boolean") {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      realtimeGenerationEnabled: parsed.realtimeGenerationEnabled,
    };
  } catch {
    return null;
  }
}

function parseStoredGraphSelection(rawValue: string | null): StoredGraphSelection | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGraphSelection;
    if (parsed.schemaVersion !== GRAPH_SNAPSHOT_SCHEMA_VERSION) {
      return null;
    }
    if (typeof parsed.graphId !== "string" || !parsed.graphId || !Array.isArray(parsed.nodeIds)) {
      return null;
    }

    return {
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId: parsed.graphId,
      nodeIds: parsed.nodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string"),
    };
  } catch {
    return null;
  }
}

function buildGraphDocument(
  graphId: string,
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  viewport: GraphViewport,
): GraphDocument {
  const graphNodes: GraphNode[] = nodes.map((node) => ({
    id: node.id,
    kind: "component",
    componentKey: node.data.definition.component_key,
    component: {
      tab: node.data.definition.tab,
      category: node.data.definition.category,
      name: node.data.definition.component,
    },
    position: node.position,
    previewEnabled: node.data.previewEnabled,
    values: sanitizeNodeValues(node.data.definition, node.data.values),
  }));

  const graphEdges: GraphEdge[] = edges.map((edge) => ({
    id: edge.id,
    sourceNodeId: edge.source,
    sourcePort: edge.sourceHandle ?? "",
    targetNodeId: edge.target,
    targetPort: edge.targetHandle ?? "",
  }));

  return {
    schemaVersion: 1,
    graphId,
    viewport,
    nodes: graphNodes,
    edges: graphEdges,
  };
}

export function getInitialNodeValues(
  definition: PyhopperComponentDefinition,
): Record<string, unknown> {
  return sanitizeNodeValues(definition, {});
}

export function GraphEditorProvider({ children }: { children: ReactNode }) {
  const [graphId, setGraphId] = useState(() => crypto.randomUUID());
  const [nodes, setNodes] = useState<Node<ComponentNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VIEWPORT);
  const [hasStoredSnapshot, setHasStoredSnapshot] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [generatedPython, setGeneratedPython] = useState<string | null>(null);
  const [renderManifest, setRenderManifest] = useState<RenderManifest | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [realtimeGenerationEnabled, setRealtimeGenerationEnabledState] = useState(true);
  const graphDocumentRef = useRef(graphDocumentPlaceholder());
  const isExportingRef = useRef(false);
  const isHydratedRef = useRef(false);
  const nodesRef = useRef<Node<ComponentNodeData>[]>([]);
  const selectedNodeIds = useMemo(
    () => nodes.filter((node) => node.selected).map((node) => node.id),
    [nodes],
  );

  function graphDocumentPlaceholder(): GraphDocument {
    return {
      schemaVersion: 1,
      graphId: "",
      viewport: DEFAULT_VIEWPORT,
      nodes: [],
      edges: [],
    };
  }

  useEffect(() => {
    const storedSnapshot = parseStoredSnapshot(window.localStorage.getItem(GRAPH_SNAPSHOT_STORAGE_KEY));
    const storedExport = parseStoredGraphExport(window.localStorage.getItem(GRAPH_EXPORT_STORAGE_KEY));
    const storedSettings = parseStoredGraphSettings(window.localStorage.getItem(GRAPH_SETTINGS_STORAGE_KEY));
    const storedSelection = parseStoredGraphSelection(window.localStorage.getItem(GRAPH_SELECTION_STORAGE_KEY));

    if (storedSnapshot) {
      const selectedNodeIds = storedSelection?.graphId === storedSnapshot.graphId ? storedSelection.nodeIds : [];
      setGraphId(storedSnapshot.graphId);
      setNodes(
        storedSnapshot.flow.nodes.map((node) => ({
          ...node,
          selected: selectedNodeIds.includes(node.id),
        })),
      );
      setEdges(storedSnapshot.flow.edges);
      setViewport(storedSnapshot.flow.viewport);
      setHasStoredSnapshot(true);
    }

    if (storedExport) {
      setModelUrl(storedExport.modelUrl);
      setGeneratedPython(storedExport.generatedPython);
      setRenderManifest(storedExport.renderManifest);
    }

    if (storedSettings) {
      setRealtimeGenerationEnabledState(storedSettings.realtimeGenerationEnabled);
    }

    setIsHydrated(true);
  }, [setEdges, setNodes]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) {
        return;
      }

      if (event.key === GRAPH_SNAPSHOT_STORAGE_KEY) {
        const storedSnapshot = parseStoredSnapshot(event.newValue);
        if (!storedSnapshot) {
          return;
        }

        setGraphId(storedSnapshot.graphId);
        setNodes(storedSnapshot.flow.nodes);
        setEdges(storedSnapshot.flow.edges);
        setViewport(storedSnapshot.flow.viewport);
        setHasStoredSnapshot(true);
        return;
      }

      if (event.key === GRAPH_EXPORT_STORAGE_KEY) {
        const storedExport = parseStoredGraphExport(event.newValue);
        if (!storedExport) {
          return;
        }

        setModelUrl(storedExport.modelUrl);
        setGeneratedPython(storedExport.generatedPython);
        setRenderManifest(storedExport.renderManifest);
        return;
      }

      if (event.key === GRAPH_SETTINGS_STORAGE_KEY) {
        const storedSettings = parseStoredGraphSettings(event.newValue);
        if (!storedSettings) {
          return;
        }

        setRealtimeGenerationEnabledState(storedSettings.realtimeGenerationEnabled);
        return;
      }

      if (event.key === GRAPH_SELECTION_STORAGE_KEY) {
        const storedSelection = parseStoredGraphSelection(event.newValue);
        if (!storedSelection || storedSelection.graphId !== graphId) {
          return;
        }

        setNodes((currentNodes) =>
          currentNodes.map((node) => ({
            ...node,
            selected: storedSelection.nodeIds.includes(node.id),
          })),
        );
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [graphId, setEdges, setNodes]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistGraphSelection({
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      graphId,
      nodeIds: selectedNodeIds,
    });
  }, [graphId, isHydrated, selectedNodeIds]);

  const setNodeValue = useCallback((nodeId: string, valueKey: string, value: unknown) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            values: {
              ...node.data.values,
              [valueKey]: value,
            },
          },
        };
      }),
    );
  }, []);

  const setNodePreviewEnabled = useCallback((nodeId: string, enabled: boolean) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            previewEnabled: enabled,
          },
        };
      }),
    );
  }, []);

  const graphDocument = useMemo(
    () => buildGraphDocument(graphId, nodes, edges, viewport),
    [edges, graphId, nodes, viewport],
  );

  graphDocumentRef.current = graphDocument;
  isExportingRef.current = isExporting;
  isHydratedRef.current = isHydrated;
  nodesRef.current = nodes;

  const exportGraph = useCallback(async () => {
    if (isExportingRef.current) {
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      const currentGraphDocument = graphDocumentRef.current;
      const response = await fetch(`${apiBaseUrl}/graphs/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentGraphDocument),
      });

      const payload = (await response.json()) as
        | GraphExportResponse
        | { error?: { message?: string }; errors?: Array<{ message?: string }> };

      if (!response.ok) {
        const errors = "errors" in payload && Array.isArray(payload.errors) ? payload.errors : [];
        const message =
          errors[0]?.message ??
          ("error" in payload && payload.error?.message ? payload.error.message : "Graph export failed");
        throw new Error(message);
      }

      if (!("glb_url" in payload) || typeof payload.glb_url !== "string") {
        throw new Error("Graph export did not return a GLB URL");
      }

      console.log("Graph export response:", payload);
      console.log("Setting modelUrl:", payload.glb_url);
      setModelUrl(payload.glb_url);
      setGeneratedPython("python_source" in payload ? payload.python_source : null);
      setRenderManifest("render_manifest" in payload ? payload.render_manifest : null);
      persistGraphExport({
        schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
        graphId: currentGraphDocument.graphId,
        modelUrl: payload.glb_url,
        generatedPython: "python_source" in payload ? payload.python_source : null,
        renderManifest: "render_manifest" in payload ? payload.render_manifest : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Graph export failed";
      setExportError(message);
      console.error("Failed to export graph", error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const requestRealtimeGeneration = useCallback(() => {
    if (!realtimeGenerationEnabled || !isHydratedRef.current || isExportingRef.current || !nodesRef.current.length) {
      return;
    }

    window.setTimeout(() => {
      void exportGraph();
    }, 0);
  }, [exportGraph, realtimeGenerationEnabled]);

  const setRealtimeGenerationEnabled = useCallback((enabled: boolean) => {
    setRealtimeGenerationEnabledState(enabled);
    persistGraphSettings({
      schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
      realtimeGenerationEnabled: enabled,
    });
  }, []);

  const value = useMemo<GraphEditorContextValue>(
    () => ({
      edges,
      exportError,
      exportGraph,
      generatedPython,
      graphDocument,
      graphId,
      hasStoredSnapshot,
      isExporting,
      isHydrated,
      modelUrl,
      nodes,
      realtimeGenerationEnabled,
      renderManifest,
      requestRealtimeGeneration,
      selectedNodeIds,
      setEdges,
      setNodes,
      setNodePreviewEnabled,
      setNodeValue,
      setRealtimeGenerationEnabled,
      setViewport,
      viewport,
    }),
    [
      edges,
      exportError,
      exportGraph,
      generatedPython,
      graphDocument,
      graphId,
      hasStoredSnapshot,
      isExporting,
      isHydrated,
      modelUrl,
      nodes,
      realtimeGenerationEnabled,
      renderManifest,
      requestRealtimeGeneration,
      selectedNodeIds,
      setNodePreviewEnabled,
      setNodeValue,
      setRealtimeGenerationEnabled,
      viewport,
    ],
  );

  return <GraphEditorContext.Provider value={value}>{children}</GraphEditorContext.Provider>;
}

export function useGraphEditor() {
  const context = useContext(GraphEditorContext);
  if (!context) {
    throw new Error("useGraphEditor must be used within a GraphEditorProvider");
  }
  return context;
}

export function persistGraphSnapshot(snapshot: StoredGraphSnapshot) {
  window.localStorage.setItem(GRAPH_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function persistGraphExport(snapshot: StoredGraphExport) {
  window.localStorage.setItem(GRAPH_EXPORT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function persistGraphSettings(snapshot: StoredGraphSettings) {
  window.localStorage.setItem(GRAPH_SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function persistGraphSelection(snapshot: StoredGraphSelection) {
  window.localStorage.setItem(GRAPH_SELECTION_STORAGE_KEY, JSON.stringify(snapshot));
}

export function createStoredGraphSnapshot(
  graphId: string,
  flow: {
    nodes: Node<ComponentNodeData>[];
    edges: Edge[];
    viewport: GraphViewport;
  },
): StoredGraphSnapshot {
  return {
    schemaVersion: GRAPH_SNAPSHOT_SCHEMA_VERSION,
    graphId,
    flow: {
      nodes: flow.nodes.map((node) => sanitizeStoredNode(node)),
      edges: flow.edges.map((edge) => sanitizeStoredEdge(edge)),
      viewport: flow.viewport,
    },
  };
}
