"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function WireEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  return <BaseEdge className="wire-edge" id={id} path={edgePath} />;
}
