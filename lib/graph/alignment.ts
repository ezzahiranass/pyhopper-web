import type { Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/lib/graph/types";

export type NodeAlignment =
  | "left"
  | "right"
  | "center"
  | "tidy-horizontal"
  | "top"
  | "bottom"
  | "middle"
  | "tidy-vertical";

const TIDY_GAP = 32;

function nodeWidth(node: Node<ComponentNodeData>) {
  return node.measured?.width ?? node.width ?? node.initialWidth ?? 0;
}

function nodeHeight(node: Node<ComponentNodeData>) {
  return node.measured?.height ?? node.height ?? node.initialHeight ?? 0;
}

function tidyNodes(
  nodes: Node<ComponentNodeData>[],
  axis: "horizontal" | "vertical",
): Map<string, { x: number; y: number }> {
  const horizontal = axis === "horizontal";
  const sorted = [...nodes].sort((left, right) => {
    const leftCenter =
      (horizontal ? left.position.x : left.position.y) +
      (horizontal ? nodeWidth(left) : nodeHeight(left)) / 2;
    const rightCenter =
      (horizontal ? right.position.x : right.position.y) +
      (horizontal ? nodeWidth(right) : nodeHeight(right)) / 2;
    return leftCenter - rightCenter;
  });
  const leading = Math.min(...sorted.map((node) => (horizontal ? node.position.x : node.position.y)));
  const trailing = Math.max(
    ...sorted.map((node) =>
      (horizontal ? node.position.x : node.position.y) +
      (horizontal ? nodeWidth(node) : nodeHeight(node)),
    ),
  );
  const totalSize = sorted.reduce(
    (sum, node) => sum + (horizontal ? nodeWidth(node) : nodeHeight(node)),
    0,
  );
  const gap = Math.max(TIDY_GAP, (trailing - leading - totalSize) / Math.max(sorted.length - 1, 1));
  const positions = new Map<string, { x: number; y: number }>();
  let cursor = leading;

  sorted.forEach((node) => {
    positions.set(node.id, {
      x: horizontal ? cursor : node.position.x,
      y: horizontal ? node.position.y : cursor,
    });
    cursor += (horizontal ? nodeWidth(node) : nodeHeight(node)) + gap;
  });

  return positions;
}

export function alignGraphNodes(
  nodes: Node<ComponentNodeData>[],
  nodeIds: string[],
  alignment: NodeAlignment,
) {
  const selectedIds = new Set(nodeIds);
  const selected = nodes.filter((node) => selectedIds.has(node.id));
  if (selected.length < 2) return nodes;

  if (alignment === "tidy-horizontal" || alignment === "tidy-vertical") {
    const positions = tidyNodes(selected, alignment === "tidy-horizontal" ? "horizontal" : "vertical");
    return nodes.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, position } : node;
    });
  }

  const left = Math.min(...selected.map((node) => node.position.x));
  const right = Math.max(...selected.map((node) => node.position.x + nodeWidth(node)));
  const top = Math.min(...selected.map((node) => node.position.y));
  const bottom = Math.max(...selected.map((node) => node.position.y + nodeHeight(node)));
  const center = (left + right) / 2;
  const middle = (top + bottom) / 2;

  return nodes.map((node) => {
    if (!selectedIds.has(node.id)) return node;

    const position = { ...node.position };
    if (alignment === "left") position.x = left;
    if (alignment === "right") position.x = right - nodeWidth(node);
    if (alignment === "center") position.x = center - nodeWidth(node) / 2;
    if (alignment === "top") position.y = top;
    if (alignment === "bottom") position.y = bottom - nodeHeight(node);
    if (alignment === "middle") position.y = middle - nodeHeight(node) / 2;
    return { ...node, position };
  });
}
