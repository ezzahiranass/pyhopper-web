"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";

import { ComponentBrowser } from "@/components/flow/ComponentBrowser";
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

export function PyhopperFlowCanvas() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<FlowClipboard | null>(null);
  const pasteCountRef = useRef(0);
  const [catalog, setCatalog] = useState<PyhopperComponentDefinition[]>([]);
  const [nodes, setNodes] = useState<Node<ComponentNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlow, setReactFlow] = useState<ReactFlowInstance<Node<ComponentNodeData>, Edge> | null>(null);
  const [searchState, setSearchState] = useState<{ isOpen: boolean; x: number; y: number }>({
    isOpen: false,
    x: 80,
    y: 80,
  });

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

  const onNodesChange = useCallback((changes: NodeChange<Node<ComponentNodeData>>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          animated: false,
          className: "wire-edge",
          type: "wire",
        },
        current,
      ),
    );
  }, []);

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
        setNodes((current) => current.map((node) => ({ ...node, selected: false })));
        setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, edges, nodes]);

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
          data: { definition },
        },
      ]);
    },
    [reactFlow],
  );

  const addComponentNode = useCallback(
    (definition: PyhopperComponentDefinition) => {
      addComponentNodeAt(definition, { x: searchState.x, y: searchState.y });
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

  return (
    <div
      className="flow-canvas"
      ref={canvasRef}
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
      <ComponentBrowser components={catalog} onSelect={addComponentFromBrowser} />
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
        panOnDrag={[1]}
        selectionOnDrag
        selectNodesOnDrag={false}
        zoomOnDoubleClick={false}
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onInit={setReactFlow}
        onNodesChange={onNodesChange}
        onPaneClick={() => {
          if (searchState.isOpen) {
            closeSearch();
          }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#6b7378"
          gap={20}
          lineWidth={1}
          size={0.8}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  );
}
