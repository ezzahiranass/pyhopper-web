"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

import { ContextMenu, ContextMenuItem } from "@/components/molecules/ContextMenu";
import { CanvasActionBar } from "@/components/organisms/CanvasActionBar";
import { ComponentBrowser } from "@/components/organisms/ComponentBrowser";
import { CompiledCodeView } from "@/components/organisms/CompiledCodeView";
import { ComponentNode } from "@/components/organisms/ComponentNode";
import { ComponentSearch } from "@/components/organisms/ComponentSearch";
import { GraphNodeContextMenu } from "@/components/organisms/GraphNodeContextMenu";
import { WireEdge } from "@/components/organisms/WireEdge";
import {
  getInitialNodeSettings,
  getInitialNodeValues,
  useGraphEditor,
} from "@/components/providers/GraphEditorProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { alignGraphNodes, type NodeAlignment } from "@/lib/graph/alignment";
import {
  BUILTIN_GRAPH_NODE_DEFINITIONS,
  componentDisplayName,
  type ComponentNodeData,
  type PortOperation,
  type PanelTextAlignment,
  type PyhopperComponentDefinition,
} from "@/lib/graph/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const SEARCH_BOX_WIDTH = 360;
const SEARCH_BOX_HEIGHT = 290;
const SEARCH_BOX_MARGIN = 8;
const PASTE_OFFSET = 40;

function panelInitialSize(definition: PyhopperComponentDefinition) {
  const shortcutText = definition.initial_values?.text;
  if (typeof shortcutText !== "string") {
    return { width: 220, height: 180 };
  }
  return {
    width: Math.min(280, Math.max(90, shortcutText.length * 8 + 28)),
    height: 58,
  };
}

type FlowClipboard = {
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
};

type ConnectGesture = {
  ctrlOrMeta: boolean;
  shift: boolean;
};

type PendingPlacement = {
  definition: PyhopperComponentDefinition;
  x: number;
  y: number;
};

type PlacementGesture = PendingPlacement & {
  dragging: boolean;
  longPressTimer: number | null;
  pointerId: number;
  startX: number;
  startY: number;
};

type NodeContextMenuState = {
  nodeIds: string[];
  submenuSide: "left" | "right";
  x: number;
  y: number;
};

type PortContextMenuState = {
  nodeId: string;
  portName: string;
  portKind: "input" | "output";
  x: number;
  y: number;
};

const PORT_OPERATIONS: { op: PortOperation; label: string }[] = [
  { op: "Graft", label: "Graft" },
  { op: "Simplify", label: "Simplify" },
  { op: "Flatten", label: "Flatten" },
  { op: "Reverse", label: "Reverse" },
  { op: "Reparametrize", label: "Reparametrize" },
];

export function PyhopperFlowCanvas() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<FlowClipboard | null>(null);
  const connectGestureRef = useRef<ConnectGesture>({ ctrlOrMeta: false, shift: false });
  const placementGestureRef = useRef<PlacementGesture | null>(null);
  const pasteCountRef = useRef(0);
  const restoredViewportRef = useRef(false);
  const [catalog, setCatalog] = useState<PyhopperComponentDefinition[]>(BUILTIN_GRAPH_NODE_DEFINITIONS);
  const [isCodeView, setIsCodeView] = useState(false);
  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState | null>(null);
  const [portContextMenu, setPortContextMenu] = useState<PortContextMenuState | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [reactFlow, setReactFlow] = useState<ReactFlowInstance<Node<ComponentNodeData>, Edge> | null>(null);
  const [searchState, setSearchState] = useState<{ isOpen: boolean; x: number; y: number }>({
    isOpen: false,
    x: 80,
    y: 80,
  });
  const {
    edges,
    generatedPython,
    hasStoredSnapshot,
    isHydrated,
    nodes,
    refreshNodeDefinitions,
    requestRealtimeGeneration,
    saveGraphSnapshot,
    setEdges,
    setNodePreviewEnabled,
    setNodes,
    setPortOperation,
    setViewport,
    viewport,
  } = useGraphEditor();
  const isGrasshopperTheme = theme === "grasshopper";

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
        setCatalog([...BUILTIN_GRAPH_NODE_DEFINITIONS, ...payload]);
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

  // Stored snapshots embed the definition each node was created with; once the live catalog is
  // in, bring every node up to date (new metadata, renamed ports) without touching its values.
  useEffect(() => {
    if (isHydrated && catalog.length > BUILTIN_GRAPH_NODE_DEFINITIONS.length) {
      refreshNodeDefinitions(catalog);
    }
  }, [catalog, isHydrated, refreshNodeDefinitions]);

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
        (edge) => !deletedNodes.some((node) => node.id === edge.source || node.id === edge.target),
      ),
    );
    requestRealtimeGeneration();
  }, [requestRealtimeGeneration, setEdges]);

  const openSearchAt = useCallback((localX: number, localY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setSearchState({
      isOpen: true,
      x: Math.max(SEARCH_BOX_MARGIN, Math.min(localX, bounds.width - SEARCH_BOX_WIDTH - SEARCH_BOX_MARGIN)),
      y: Math.max(SEARCH_BOX_MARGIN, Math.min(localY, bounds.height - SEARCH_BOX_HEIGHT - SEARCH_BOX_MARGIN)),
    });
  }, []);

  const closeSearch = useCallback(() => {
    setSearchState((current) => ({ ...current, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTextInput = tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable;

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
          (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
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

        setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), ...pastedNodes]);
        setEdges((current) => [...current.map((edge) => ({ ...edge, selected: false })), ...pastedEdges]);
        return;
      }

      if (event.key === "Escape") {
        const placementGesture = placementGestureRef.current;
        if (placementGesture?.longPressTimer != null) {
          window.clearTimeout(placementGesture.longPressTimer);
        }
        placementGestureRef.current = null;
        setPendingPlacement(null);
        setNodeContextMenu(null);
        setPortContextMenu(null);
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
            definition.component === "Panel"
              ? panelInitialSize(definition)
              : undefined,
          data: {
            definition,
            previewEnabled: true,
            previews: {},
            settings: getInitialNodeSettings(definition),
            values: getInitialNodeValues(definition),
            portOperations: {},
          },
        },
      ]);
      if (definition.component !== "Object Reference") {
        requestRealtimeGeneration();
      }
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

  const setPlacementPreview = useCallback(
    (definition: PyhopperComponentDefinition, clientX: number, clientY: number) => {
      const bounds = canvasRef.current?.getBoundingClientRect();
      setPendingPlacement({
        definition,
        x: clientX - (bounds?.left ?? 0),
        y: clientY - (bounds?.top ?? 0),
      });
    },
    [],
  );

  const handlePlacementPointerDown = useCallback(
    (definition: PyhopperComponentDefinition, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const gesture: PlacementGesture = {
        definition,
        dragging: false,
        longPressTimer: null,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
      };

      gesture.longPressTimer = window.setTimeout(() => {
        const activeGesture = placementGestureRef.current;
        if (!activeGesture || activeGesture.pointerId !== event.pointerId) return;
        activeGesture.dragging = true;
        setPlacementPreview(activeGesture.definition, activeGesture.x, activeGesture.y);
      }, 180);
      placementGestureRef.current = gesture;
    },
    [setPlacementPreview],
  );

  const handlePlacementPointerMove = useCallback(
    (definition: PyhopperComponentDefinition, event: ReactPointerEvent<HTMLButtonElement>) => {
      const gesture = placementGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.definition !== definition) return;

      gesture.x = event.clientX;
      gesture.y = event.clientY;
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 5) {
        gesture.dragging = true;
        if (gesture.longPressTimer !== null) {
          window.clearTimeout(gesture.longPressTimer);
          gesture.longPressTimer = null;
        }
      }

      if (gesture.dragging) {
        setPlacementPreview(definition, event.clientX, event.clientY);
      }
    },
    [setPlacementPreview],
  );

  const handlePlacementPointerUp = useCallback(
    (definition: PyhopperComponentDefinition, event: ReactPointerEvent<HTMLButtonElement>) => {
      const gesture = placementGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.definition !== definition) return;

      if (gesture.longPressTimer !== null) {
        window.clearTimeout(gesture.longPressTimer);
      }
      placementGestureRef.current = null;

      if (gesture.dragging) {
        const bounds = canvasRef.current?.getBoundingClientRect();
        const releaseElement = document.elementFromPoint(event.clientX, event.clientY);
        const releasedOverBrowser = Boolean(releaseElement?.closest(".component-browser"));
        const isInsideCanvas =
          bounds &&
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;
        if (isInsideCanvas && !releasedOverBrowser) {
          addComponentNodeAt(definition, { x: event.clientX, y: event.clientY });
          setPendingPlacement(null);
        } else if (releasedOverBrowser) {
          setPlacementPreview(definition, event.clientX, event.clientY);
        } else {
          setPendingPlacement(null);
        }
        return;
      }

      setPlacementPreview(definition, event.clientX, event.clientY);
    },
    [addComponentNodeAt, setPlacementPreview],
  );

  const alignSelectedNodes = useCallback(
    (alignment: NodeAlignment) => {
      if (!nodeContextMenu) return;
      setNodes((current) => alignGraphNodes(current, nodeContextMenu.nodeIds, alignment));
      setNodeContextMenu(null);
    },
    [nodeContextMenu, setNodes],
  );

  const setSelectedPreview = useCallback(
    (enabled: boolean) => {
      if (!nodeContextMenu) return;
      nodeContextMenu.nodeIds.forEach((nodeId) => setNodePreviewEnabled(nodeId, enabled));
      setNodeContextMenu(null);
      requestRealtimeGeneration();
    },
    [nodeContextMenu, requestRealtimeGeneration, setNodePreviewEnabled],
  );

  const setPanelTextAlign = useCallback(
    (alignment: PanelTextAlignment) => {
      if (!nodeContextMenu || nodeContextMenu.nodeIds.length !== 1) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeContextMenu.nodeIds[0]
            ? {
                ...node,
                data: {
                  ...node.data,
                  values: { ...node.data.values, textAlign: alignment },
                },
              }
            : node,
        ),
      );
      setNodeContextMenu(null);
    },
    [nodeContextMenu, setNodes],
  );

  const setPanelMultilineData = useCallback(
    (enabled: boolean) => {
      if (!nodeContextMenu || nodeContextMenu.nodeIds.length !== 1) return;
      const nodeId = nodeContextMenu.nodeIds[0];
      if (edges.some((edge) => edge.target === nodeId)) return;

      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  values: { ...node.data.values, multilineData: enabled },
                },
              }
            : node,
        ),
      );
      setNodeContextMenu(null);
      requestRealtimeGeneration();
    },
    [edges, nodeContextMenu, requestRealtimeGeneration, setNodes],
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
      saveGraphSnapshot({
        nodes: snapshot.nodes as Node<ComponentNodeData>[],
        edges: snapshot.edges,
        viewport: snapshot.viewport,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [edges, isHydrated, nodes, reactFlow, saveGraphSnapshot, viewport]);

  useEffect(() => {
    const handleNodeContextMenu = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeIds: string[]; clientX: number; clientY: number }>;
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      setPortContextMenu(null);
      setNodeContextMenu({
        nodeIds: customEvent.detail.nodeIds,
        submenuSide: customEvent.detail.clientX - bounds.left > bounds.width - 420 ? "left" : "right",
        x: customEvent.detail.clientX - bounds.left,
        y: customEvent.detail.clientY - bounds.top,
      });
    };

    const handlePortContextMenu = (event: Event) => {
      const customEvent = event as CustomEvent<{
        nodeId: string;
        portName: string;
        portKind: "input" | "output";
        clientX: number;
        clientY: number;
      }>;
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      setNodeContextMenu(null);
      setPortContextMenu({
        nodeId: customEvent.detail.nodeId,
        portName: customEvent.detail.portName,
        portKind: customEvent.detail.portKind,
        x: customEvent.detail.clientX - bounds.left,
        y: customEvent.detail.clientY - bounds.top,
      });
    };

    window.addEventListener("pyhopper-node-contextmenu", handleNodeContextMenu as EventListener);
    window.addEventListener("pyhopper-port-contextmenu", handlePortContextMenu as EventListener);
    return () => {
      window.removeEventListener("pyhopper-node-contextmenu", handleNodeContextMenu as EventListener);
      window.removeEventListener("pyhopper-port-contextmenu", handlePortContextMenu as EventListener);
    };
  }, []);

  return (
    <div
      className="flow-canvas"
      data-placing-component={pendingPlacement ? "true" : undefined}
      ref={canvasRef}
      onPointerMove={(event) => {
        if (pendingPlacement && !placementGestureRef.current) {
          setPlacementPreview(pendingPlacement.definition, event.clientX, event.clientY);
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setNodeContextMenu(null);
      }}
      onDoubleClick={(event) => {
        if (event.button !== 0) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        openSearchAt(event.clientX - bounds.left, event.clientY - bounds.top);
      }}
    >
      {!isCodeView ? (
        <ComponentBrowser
          components={catalog}
          onPlacementPointerDown={handlePlacementPointerDown}
          onPlacementPointerMove={handlePlacementPointerMove}
          onPlacementPointerUp={handlePlacementPointerUp}
        />
      ) : null}
      {pendingPlacement ? (
        <div
          className="component-placement-preview"
          style={{
            left: pendingPlacement.x,
            top: pendingPlacement.y,
          }}
        >
          {componentDisplayName(pendingPlacement.definition)}
        </div>
      ) : null}
      <CanvasActionBar
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
            onSelectionContextMenu={(event, selectedNodes) => {
              event.preventDefault();
              event.stopPropagation();
              const bounds = canvasRef.current?.getBoundingClientRect();
              if (!bounds) return;
              setPortContextMenu(null);
              setNodeContextMenu({
                nodeIds: selectedNodes.map((node) => node.id),
                submenuSide: event.clientX - bounds.left > bounds.width - 420 ? "left" : "right",
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              });
            }}
            onPaneClick={(event) => {
              if (pendingPlacement) {
                addComponentNodeAt(pendingPlacement.definition, {
                  x: event.clientX,
                  y: event.clientY,
                });
                setPendingPlacement(null);
                return;
              }
              setNodeContextMenu(null);
              setPortContextMenu(null);
              if (searchState.isOpen) {
                closeSearch();
              }
            }}
            edgesReconnectable
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap
              className="flow-minimap"
              maskColor={isGrasshopperTheme ? "rgba(209, 206, 197, 0.72)" : "rgba(216, 224, 228, 0.72)"}
              nodeBorderRadius={2}
              nodeColor={isGrasshopperTheme ? "#d9d9d6" : "#8c9aa0"}
              nodeStrokeColor={isGrasshopperTheme ? "#5d5d5b" : "#30464f"}
              pannable
              position="bottom-left"
              zoomable
            />
            <Background
              color={isGrasshopperTheme ? "#adaaa1" : "#6b7378"}
              gap={isGrasshopperTheme ? 96 : 20}
              lineWidth={1}
              size={0.8}
              variant={isGrasshopperTheme ? BackgroundVariant.Lines : BackgroundVariant.Dots}
            />
          </ReactFlow>
          {portContextMenu ? (
            <ContextMenu x={portContextMenu.x} y={portContextMenu.y}>
              {PORT_OPERATIONS.map(({ op, label }) => {
                const node = nodes.find((entry) => entry.id === portContextMenu.nodeId);
                const opKey = `${portContextMenu.portKind}:${portContextMenu.portName}`;
                const isActive = node?.data.portOperations[opKey] === op;
                return (
                  <ContextMenuItem
                    active={isActive}
                    key={op}
                    onClick={() => {
                      setPortOperation(portContextMenu.nodeId, portContextMenu.portKind, portContextMenu.portName, op);
                      setPortContextMenu(null);
                      requestRealtimeGeneration();
                    }}
                  >
                    {label}
                  </ContextMenuItem>
                );
              })}
            </ContextMenu>
          ) : null}
          {nodeContextMenu ? (
            <GraphNodeContextMenu
              edges={edges}
              nodeIds={nodeContextMenu.nodeIds}
              nodes={nodes}
              onAlign={alignSelectedNodes}
              onPanelMultilineDataChange={setPanelMultilineData}
              onPanelTextAlign={setPanelTextAlign}
              onPreviewChange={setSelectedPreview}
              submenuSide={nodeContextMenu.submenuSide}
              x={nodeContextMenu.x}
              y={nodeContextMenu.y}
            />
          ) : null}
        </>
      ) : (
        <CompiledCodeView code={generatedPython} />
      )}
    </div>
  );
}
