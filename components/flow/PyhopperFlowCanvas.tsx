"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MiniMap,
  ReactFlow,
  reconnectEdge,
  SelectionMode,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";

import { ComponentBrowser } from "@/components/flow/ComponentBrowser";
import { CompiledCodeView } from "@/components/flow/CompiledCodeView";
import {
  createStoredGraphSnapshot,
  getInitialNodeValues,
  persistGraphSnapshot,
  useGraphEditor,
} from "@/components/flow/GraphEditorContext";
import { GraphExportButton } from "@/components/flow/GraphExportButton";
import { ComponentNode } from "@/components/flow/ComponentNode";
import { ComponentSearch } from "@/components/flow/ComponentSearch";
import type { ComponentNodeData, PyhopperComponentDefinition } from "@/components/flow/types";
import { WireEdge } from "@/components/flow/WireEdge";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";
const SEARCH_BOX_WIDTH = 360;
const SEARCH_BOX_MARGIN = 8;
const PASTE_OFFSET = 40;

type FlowClipboard = {
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
};

type ConnectGesture = {
  ctrlOrMeta: boolean;
  shift: boolean;
};

type NodeContextMenuState = {
  nodeIds: string[];
  x: number;
  y: number;
};

export function PyhopperFlowCanvas() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<FlowClipboard | null>(null);
  const connectGestureRef = useRef<ConnectGesture>({ ctrlOrMeta: false, shift: false });
  const pasteCountRef = useRef(0);
  const restoredViewportRef = useRef(false);
  const [catalog, setCatalog] = useState<PyhopperComponentDefinition[]>([]);
  const [isCodeView, setIsCodeView] = useState(false);
  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState | null>(null);
  const [reactFlow, setReactFlow] = useState<ReactFlowInstance<Node<ComponentNodeData>, Edge> | null>(null);
  const [searchState, setSearchState] = useState<{ isOpen: boolean; x: number; y: number }>({
    isOpen: false,
    x: 80,
    y: 80,
  });
  const {
    edges,
    graphId,
    generatedPython,
    hasStoredSnapshot,
    isHydrated,
    nodes,
    requestRealtimeGeneration,
    setEdges,
    setNodePreviewEnabled,
    setNodes,
    setViewport,
    viewport,
  } = useGraphEditor();

  useEffect(() => {
    const controller = new AbortController();

    const loadComponents = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/components`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load components: ${response.status}`);
        }

        const payload = (await response.json()) as PyhopperComponentDefinition[];
        setCatalog(payload);
        console.log("pyhopper components:", payload);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load pyhopper components", error);
      }
    };

    void loadComponents();

    return () => controller.abort();
  }, []);

  const nodeTypes = useMemo(() => ({ component: ComponentNode }), []);
  const edgeTypes = useMemo(() => ({ wire: WireEdge }), []);
  const findNodeDefinition = useCallback(
    (nodeId: string) => nodes.find((node) => node.id === nodeId)?.data.definition,
    [nodes],
  );

  const isVariadicTargetHandle = useCallback(
    (nodeId: string, handleId: string | null | undefined) => {
      if (!handleId) {
        return false;
      }

      const definition = findNodeDefinition(nodeId);
      if (!definition?.variadic_inputs || !definition.inputs.length) {
        return false;
      }

      return definition.inputs[definition.inputs.length - 1]?.name === handleId;
    },
    [findNodeDefinition],
  );

  const onNodesChange = useCallback((changes: NodeChange<Node<ComponentNodeData>>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
    if (changes.some((change) => change.type === "remove")) {
      requestRealtimeGeneration();
    }
  }, [requestRealtimeGeneration, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    const nextEdge = {
      ...connection,
      animated: false,
      className: "wire-edge",
      type: "wire" as const,
    };

    const { ctrlOrMeta, shift } = connectGestureRef.current;
    let changed = false;

    setEdges((current) => {
      if (!connection.source || !connection.target) {
        return current;
      }

      if (ctrlOrMeta && shift) {
        const rewiredEdges = current.filter(
          (edge) =>
            !(
              edge.target === connection.target &&
              edge.targetHandle === (connection.targetHandle ?? null)
            ),
        );
        const appendedEdges = addEdge(nextEdge, rewiredEdges);
        changed = appendedEdges.length !== current.length || appendedEdges !== current;
        return appendedEdges;
      }

      if (ctrlOrMeta && !shift) {
        const filtered = current.filter(
          (edge) =>
            !(
              edge.source === connection.source &&
              edge.sourceHandle === (connection.sourceHandle ?? null) &&
              edge.target === connection.target &&
              edge.targetHandle === (connection.targetHandle ?? null)
            ),
        );
        changed = filtered.length !== current.length;
        return filtered;
      }

      let nextEdges = current;
      const shouldReplaceIncoming = !shift && !isVariadicTargetHandle(connection.target, connection.targetHandle);

      if (shouldReplaceIncoming) {
        nextEdges = nextEdges.filter(
          (edge) =>
            !(
              edge.target === connection.target &&
              edge.targetHandle === (connection.targetHandle ?? null)
            ),
        );
      }

      const appendedEdges = addEdge(nextEdge, nextEdges);
      changed = appendedEdges.length !== current.length || appendedEdges !== current;
      return appendedEdges;
    });

    if (changed) {
      requestRealtimeGeneration();
    }
  }, [isVariadicTargetHandle, requestRealtimeGeneration, setEdges]);

  const onReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    setEdges((current) => reconnectEdge(oldEdge, connection, current));
    requestRealtimeGeneration();
  }, [requestRealtimeGeneration, setEdges]);

  const onNodesDelete = useCallback((deletedNodes: Node<ComponentNodeData>[]) => {
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          !deletedNodes.some((node) => node.id === edge.source || node.id === edge.target),
      ),
    );
    requestRealtimeGeneration();
  }, [requestRealtimeGeneration, setEdges]);

  const openSearchAt = useCallback((localX: number, localY: number) => {
    setSearchState({
      isOpen: true,
      x: Math.max(SEARCH_BOX_MARGIN, Math.min(localX, window.innerWidth - SEARCH_BOX_WIDTH - SEARCH_BOX_MARGIN)),
      y: localY,
    });
  }, []);

  const closeSearch = useCallback(() => {
    setSearchState((current) => ({ ...current, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTextInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTextInput) {
        return;
      }

      const modifierPressed = event.ctrlKey || event.metaKey;

      if (modifierPressed && event.key.toLowerCase() === "a") {
        if (!nodes.length && !edges.length) {
          return;
        }

        event.preventDefault();
        setNodes((current) => current.map((node) => ({ ...node, selected: true })));
        setEdges((current) => current.map((edge) => ({ ...edge, selected: true })));
        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "c") {
        const selectedNodes = nodes.filter((node) => node.selected);
        const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
        const selectedEdges = edges.filter(
          (edge) =>
            selectedNodeIds.has(edge.source) &&
            selectedNodeIds.has(edge.target),
        );

        if (selectedNodes.length) {
          clipboardRef.current = {
            nodes: selectedNodes.map((node) => ({
              ...node,
              selected: false,
            })),
            edges: selectedEdges.map((edge) => ({
              ...edge,
              selected: false,
            })),
          };
          pasteCountRef.current = 0;
          event.preventDefault();
        }

        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "v" && clipboardRef.current) {
        event.preventDefault();

        pasteCountRef.current += 1;
        const offset = PASTE_OFFSET * pasteCountRef.current;
        const nodeIdMap = new Map<string, string>();

        const pastedNodes = clipboardRef.current.nodes.map((node) => {
          const nextId = `${node.id}-copy-${crypto.randomUUID()}`;
          nodeIdMap.set(node.id, nextId);

          return {
            ...node,
            id: nextId,
            position: {
              x: node.position.x + offset,
              y: node.position.y + offset,
            },
            selected: true,
          };
        });

        const pastedEdges = clipboardRef.current.edges.map((edge) => ({
          ...edge,
          id: `${edge.id}-copy-${crypto.randomUUID()}`,
          source: nodeIdMap.get(edge.source) ?? edge.source,
          target: nodeIdMap.get(edge.target) ?? edge.target,
          selected: true,
        }));

        setNodes((current) => [
          ...current.map((node) => ({ ...node, selected: false })),
          ...pastedNodes,
        ]);
        setEdges((current) => [
          ...current.map((edge) => ({ ...edge, selected: false })),
          ...pastedEdges,
        ]);

        return;
      }

      if (event.key === "Escape") {
        setNodeContextMenu(null);
        setNodes((current) => current.map((node) => ({ ...node, selected: false })));
        setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, edges, nodes, setEdges, setNodes]);

  const addComponentNodeAt = useCallback(
    (definition: PyhopperComponentDefinition, screenPosition: { x: number; y: number }) => {
      if (!reactFlow) {
        return;
      }

      const position = reactFlow.screenToFlowPosition(screenPosition);

      setNodes((current) => [
        ...current,
        {
          id: `${definition.tab}-${definition.category}-${definition.component}-${crypto.randomUUID()}`,
          type: "component",
          position,
          style:
            definition.frontend_preset === "panel"
              ? {
                  width: 220,
                  height: 180,
                }
              : undefined,
          data: {
            definition,
            previewEnabled: true,
            previews: {},
            values: getInitialNodeValues(definition),
          },
        },
      ]);
      requestRealtimeGeneration();
    },
    [reactFlow, requestRealtimeGeneration, setNodes],
  );

  const addComponentNode = useCallback(
    (definition: PyhopperComponentDefinition) => {
      if (!canvasRef.current) {
        return;
      }

      const bounds = canvasRef.current.getBoundingClientRect();
      addComponentNodeAt(definition, {
        x: bounds.left + searchState.x,
        y: bounds.top + searchState.y,
      });
      closeSearch();
    },
    [addComponentNodeAt, closeSearch, searchState.x, searchState.y],
  );

  const addComponentFromBrowser = useCallback(
    (definition: PyhopperComponentDefinition) => {
      if (!reactFlow || !canvasRef.current) {
        return;
      }

      const bounds = canvasRef.current.getBoundingClientRect();
      const center = {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };

      addComponentNodeAt(definition, center);
    },
    [addComponentNodeAt, reactFlow],
  );

  useEffect(() => {
    if (!reactFlow || !isHydrated) {
      return;
    }

    if (hasStoredSnapshot && !restoredViewportRef.current) {
      restoredViewportRef.current = true;
      reactFlow.setViewport(viewport, { duration: 0 });
    }
  }, [hasStoredSnapshot, isHydrated, reactFlow, viewport]);

  useEffect(() => {
    if (!reactFlow || !isHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const snapshot = reactFlow.toObject();
      persistGraphSnapshot(
        createStoredGraphSnapshot(graphId, {
          nodes: snapshot.nodes as Node<ComponentNodeData>[],
          edges: snapshot.edges,
          viewport: snapshot.viewport,
        }),
      );
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [edges, graphId, isHydrated, nodes, reactFlow, viewport]);

  useEffect(() => {
    const handleNodeContextMenu = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeIds: string[]; clientX: number; clientY: number }>;
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      setNodeContextMenu({
        nodeIds: customEvent.detail.nodeIds,
        x: customEvent.detail.clientX - bounds.left,
        y: customEvent.detail.clientY - bounds.top,
      });
    };

    window.addEventListener("pyhopper-node-contextmenu", handleNodeContextMenu as EventListener);
    return () => window.removeEventListener("pyhopper-node-contextmenu", handleNodeContextMenu as EventListener);
  }, []);

  return (
    <div
      className="flow-canvas"
      ref={canvasRef}
      onContextMenu={(event) => {
        event.preventDefault();
        setNodeContextMenu(null);
      }}
      onDoubleClick={(event) => {
        if (event.button !== 0) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        openSearchAt(
          Math.max(
            SEARCH_BOX_MARGIN,
            Math.min(event.clientX - bounds.left, bounds.width - SEARCH_BOX_WIDTH - SEARCH_BOX_MARGIN),
          ),
          event.clientY - bounds.top,
        );
      }}
    >
      {!isCodeView ? <ComponentBrowser components={catalog} onSelect={addComponentFromBrowser} /> : null}
      <GraphExportButton
        isCodeView={isCodeView}
        onToggleCodeView={() => setIsCodeView((current) => !current)}
      />
      {!isCodeView ? (
        <>
          <ComponentSearch
            key={`${searchState.isOpen}-${searchState.x}-${searchState.y}`}
            components={catalog}
            isOpen={searchState.isOpen}
            onClose={closeSearch}
            onSelect={addComponentNode}
            x={searchState.x}
            y={searchState.y}
          />
          <ReactFlow
            connectionLineType={ConnectionLineType.Bezier}
            defaultEdgeOptions={{ type: "wire" }}
            deleteKeyCode={["Backspace", "Delete"]}
            elementsSelectable
            multiSelectionKeyCode="Shift"
            panOnDrag={[2]}
            selectionMode={SelectionMode.Partial}
            selectionOnDrag
            selectNodesOnDrag={false}
            zoomOnDoubleClick={false}
            fitView={!hasStoredSnapshot}
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            onConnectEnd={() => {
              connectGestureRef.current = { ctrlOrMeta: false, shift: false };
            }}
            onConnectStart={(event) => {
              connectGestureRef.current = {
                ctrlOrMeta: event.ctrlKey || event.metaKey,
                shift: event.shiftKey,
              };
            }}
            onEdgesChange={onEdgesChange}
            onReconnect={onReconnect}
            onInit={(instance) => {
              setReactFlow(instance);
              setViewport(instance.getViewport());
            }}
            onMoveEnd={(_, nextViewport) => {
              if (nextViewport) {
                setViewport(nextViewport);
              } else if (reactFlow) {
                setViewport(reactFlow.getViewport());
              }
            }}
            onNodeDragStart={(_, draggedNode) => {
              setNodeContextMenu(null);
              setNodes((current) =>
                current.map((node) => ({
                  ...node,
                  selected: node.id === draggedNode.id,
                })),
              );
              setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
            }}
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
            onPaneClick={() => {
              setNodeContextMenu(null);
              if (searchState.isOpen) {
                closeSearch();
              }
            }}
            edgesReconnectable
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap
              className="flow-minimap"
              maskColor="rgba(216, 224, 228, 0.72)"
              nodeBorderRadius={2}
              nodeColor="#8c9aa0"
              nodeStrokeColor="#30464f"
              pannable
              position="bottom-left"
              zoomable
            />
            <Background
              color="#6b7378"
              gap={20}
              lineWidth={1}
              size={0.8}
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>
          {nodeContextMenu ? (
            <div
              className="flow-node-menu"
              style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
            >
              <button
                className="flow-node-menu__item"
                onClick={() => {
                  const targetNodes = nodes.filter((entry) => nodeContextMenu.nodeIds.includes(entry.id));
                  if (!targetNodes.length) {
                    setNodeContextMenu(null);
                    return;
                  }

                  const nextPreviewEnabled = !targetNodes.every((entry) => entry.data.previewEnabled);
                  targetNodes.forEach((node) => {
                    setNodePreviewEnabled(node.id, nextPreviewEnabled);
                  });
                  setNodeContextMenu(null);
                  requestRealtimeGeneration();
                }}
                type="button"
              >
                Preview {nodes
                  .filter((entry) => nodeContextMenu.nodeIds.includes(entry.id))
                  .every((entry) => entry.data.previewEnabled)
                  ? "Off"
                  : "On"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <CompiledCodeView code={generatedPython} />
      )}
    </div>
  );
}
