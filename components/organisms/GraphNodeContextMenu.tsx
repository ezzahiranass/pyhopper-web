"use client";

import type { Edge, Node } from "@xyflow/react";
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
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  EyeOff,
  ListTree,
  SlidersHorizontal,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
} from "@/components/molecules/ContextMenu";
import { hasAuthoredValues } from "@/lib/graph/authoredValues";
import { isSpecialComponent } from "@/lib/graph/specialComponents";
import type { NodeAlignment } from "@/lib/graph/alignment";
import type { ComponentNodeData } from "@/lib/graph/types";
import type { PanelTextAlignment } from "@/lib/graph/types";

type GraphNodeContextMenuProps = {
  nodeIds: string[];
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
  onAlign: (alignment: NodeAlignment) => void;
  onEditValues: () => void;
  onPanelMultilineDataChange: (enabled: boolean) => void;
  onPreviewChange: (enabled: boolean) => void;
  onPanelTextAlign: (alignment: PanelTextAlignment) => void;
  submenuSide: "left" | "right";
  x: number;
  y: number;
};

export function GraphNodeContextMenu({
  nodeIds,
  nodes,
  edges,
  onAlign,
  onEditValues,
  onPanelMultilineDataChange,
  onPreviewChange,
  onPanelTextAlign,
  submenuSide,
  x,
  y,
}: GraphNodeContextMenuProps) {
  const selectedIds = new Set(nodeIds);
  const targetNodes = nodes.filter((node) => selectedIds.has(node.id));
  const previewEnabled = targetNodes.every((node) => node.data.previewEnabled);
  const canAlign = targetNodes.length > 1;
  // one node whose component declares authored values gets a generic editor (object
  // references pick their object on the node itself)
  const canEditValues =
    targetNodes.length === 1 &&
    hasAuthoredValues(targetNodes[0].data.definition) &&
    !isSpecialComponent(targetNodes[0].data.definition, "objectReference");
  const panelNode =
    targetNodes.length === 1 && isSpecialComponent(targetNodes[0].data.definition, "panel")
      ? targetNodes[0]
      : null;
  const panelHasIncomingData = panelNode
    ? edges.some((edge) => edge.target === panelNode.id)
    : false;
  const panelMultilineData = panelNode ? panelNode.data.values.multilineData === true : null;
  const panelTextAlign =
    panelNode
      ? panelNode.data.values.textAlign === "center" || panelNode.data.values.textAlign === "right"
        ? panelNode.data.values.textAlign
        : "left"
      : null;

  return (
    <ContextMenu submenuSide={submenuSide} x={x} y={y}>
      <ContextMenuItem
        icon={previewEnabled ? <EyeOff /> : <Eye />}
        onClick={() => onPreviewChange(!previewEnabled)}
      >
        Preview {previewEnabled ? "Off" : "On"}
      </ContextMenuItem>
      {canEditValues ? (
        <ContextMenuItem icon={<SlidersHorizontal />} onClick={onEditValues}>
          Edit Values…
        </ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      {panelTextAlign ? (
        <>
          <ContextMenuItem
            active={panelMultilineData === true}
            disabled={panelHasIncomingData}
            icon={<ListTree />}
            onClick={() => onPanelMultilineDataChange(panelMultilineData !== true)}
          >
            Multiline Data
          </ContextMenuItem>
          <ContextMenuSubmenu icon={<AlignLeft />} label="Text Align">
            <ContextMenuItem active={panelTextAlign === "left"} icon={<AlignLeft />} onClick={() => onPanelTextAlign("left")}>
              Align Text Left
            </ContextMenuItem>
            <ContextMenuItem active={panelTextAlign === "center"} icon={<AlignCenter />} onClick={() => onPanelTextAlign("center")}>
              Align Text Center
            </ContextMenuItem>
            <ContextMenuItem active={panelTextAlign === "right"} icon={<AlignRight />} onClick={() => onPanelTextAlign("right")}>
              Align Text Right
            </ContextMenuItem>
          </ContextMenuSubmenu>
          <ContextMenuSeparator />
        </>
      ) : null}
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
