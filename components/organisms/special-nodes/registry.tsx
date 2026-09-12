"use client";

import type { ReactNode } from "react";

import { BooleanToggleNode } from "@/components/organisms/special-nodes/BooleanToggleNode";
import { GraphMapperNode } from "@/components/organisms/special-nodes/GraphMapperNode";
import { MDSliderNode } from "@/components/organisms/special-nodes/MDSliderNode";
import { NumberSliderNode } from "@/components/organisms/special-nodes/NumberSliderNode";
import { ObjectReferenceNode } from "@/components/organisms/special-nodes/ObjectReferenceNode";
import { PanelNode } from "@/components/organisms/special-nodes/PanelNode";
import { PointOnCurveNode } from "@/components/organisms/special-nodes/PointOnCurveNode";
import type { ComponentNodeData, PyhopperComponentDefinition } from "@/lib/graph/types";

export type SpecialNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

function normalizeComponentName(name: string) {
  return name.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

const SPECIAL_NODE_BY_COMPONENT_NAME: Record<string, (props: SpecialNodeProps) => ReactNode> = {
  booleantoggle: (props) => <BooleanToggleNode {...props} />,
  graphmapper: (props) => <GraphMapperNode {...props} />,
  mdslider: (props) => <MDSliderNode {...props} />,
  numberslider: (props) => <NumberSliderNode {...props} />,
  objectreference: (props) => <ObjectReferenceNode {...props} />,
  panel: (props) => <PanelNode {...props} />,
  pointoncurve: (props) => <PointOnCurveNode {...props} />,
};

export function renderSpecialNode(definition: PyhopperComponentDefinition, props: SpecialNodeProps) {
  return SPECIAL_NODE_BY_COMPONENT_NAME[normalizeComponentName(definition.component)]?.(props) ?? null;
}
