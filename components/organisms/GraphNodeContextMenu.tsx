"use client";

import type { Node } from "@xyflow/react";
import {
  AlignCenterHorizontal,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
} from "@/components/molecules/ContextMenu";
import type { NodeAlignment } from "@/lib/graph/alignment";
import type { ComponentNodeData } from "@/lib/graph/types";

type GraphNodeContextMenuProps = {
  nodeIds: string[];
  nodes: Node<ComponentNodeData>[];
  onAlign: (alignment: NodeAlignment) => void;
  onPreviewChange: (enabled: boolean) => void;
  submenuSide: "left" | "right";
  x: number;
  y: number;
};

export function GraphNodeContextMenu({
  nodeIds,
  nodes,
  onAlign,
  onPreviewChange,
  submenuSide,
  x,
  y,
}: GraphNodeContextMenuProps) {
  const selectedIds = new Set(nodeIds);
  const targetNodes = nodes.filter((node) => selectedIds.has(node.id));
  const previewEnabled = targetNodes.every((node) => node.data.previewEnabled);
  const canAlign = targetNodes.length > 1;

  return (
    <ContextMenu submenuSide={submenuSide} x={x} y={y}>
      <ContextMenuItem
        icon={previewEnabled ? <EyeOff /> : <Eye />}
        onClick={() => onPreviewChange(!previewEnabled)}
      >
        Preview {previewEnabled ? "Off" : "On"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSubmenu disabled={!canAlign} icon={<AlignCenterHorizontal />} label="Align">
        <ContextMenuItem icon={<AlignHorizontalJustifyStart />} onClick={() => onAlign("left")}>
          Align Left
        </ContextMenuItem>
        <ContextMenuItem icon={<AlignHorizontalJustifyEnd />} onClick={() => onAlign("right")}>
          Align Right
        </ContextMenuItem>
        <ContextMenuItem icon={<AlignHorizontalJustifyCenter />} onClick={() => onAlign("center")}>
          Align Center
        </ContextMenuItem>
        <ContextMenuItem icon={<AlignHorizontalSpaceBetween />} onClick={() => onAlign("tidy-horizontal")}>
          Tidy Up Horizontally
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem icon={<AlignVerticalJustifyStart />} onClick={() => onAlign("top")}>
          Align Top
        </ContextMenuItem>
        <ContextMenuItem icon={<AlignVerticalJustifyEnd />} onClick={() => onAlign("bottom")}>
          Align Bottom
        </ContextMenuItem>
        <ContextMenuItem icon={<AlignVerticalJustifyCenter />} onClick={() => onAlign("middle")}>
          Align Middle
        </ContextMenuItem>
        <ContextMenuItem icon={<AlignVerticalSpaceBetween />} onClick={() => onAlign("tidy-vertical")}>
          Tidy Up Vertically
        </ContextMenuItem>
      </ContextMenuSubmenu>
    </ContextMenu>
  );
}
