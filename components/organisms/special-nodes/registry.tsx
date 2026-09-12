"use client";

import type { ReactNode } from "react";

import { BooleanToggleNode } from "@/components/organisms/special-nodes/BooleanToggleNode";
import { GraphMapperNode } from "@/components/organisms/special-nodes/GraphMapperNode";
import { MDSliderNode } from "@/components/organisms/special-nodes/MDSliderNode";
import { NumberSliderNode } from "@/components/organisms/special-nodes/NumberSliderNode";
import { ObjectReferenceNode } from "@/components/organisms/special-nodes/ObjectReferenceNode";
import { PanelNode } from "@/components/organisms/special-nodes/PanelNode";
import { PointOnCurveNode } from "@/components/organisms/special-nodes/PointOnCurveNode";
import { specialComponentOf, type SpecialComponent } from "@/lib/graph/specialComponents";
import type { ComponentNodeData, PyhopperComponentDefinition } from "@/lib/graph/types";

export type SpecialNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

const SPECIAL_NODE_RENDERERS: Record<SpecialComponent, (props: SpecialNodeProps) => ReactNode> = {
  booleanToggle: (props) => <BooleanToggleNode {...props} />,
  graphMapper: (props) => <GraphMapperNode {...props} />,
  mdSlider: (props) => <MDSliderNode {...props} />,
  numberSlider: (props) => <NumberSliderNode {...props} />,
  objectReference: (props) => <ObjectReferenceNode {...props} />,
  panel: (props) => <PanelNode {...props} />,
  pointOnCurve: (props) => <PointOnCurveNode {...props} />,
};

export function renderSpecialNode(definition: PyhopperComponentDefinition, props: SpecialNodeProps) {
  const special = specialComponentOf(definition);
  return special ? SPECIAL_NODE_RENDERERS[special](props) : null;
}
