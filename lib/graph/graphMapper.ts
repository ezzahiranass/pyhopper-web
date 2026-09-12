import type { GraphMapperType } from "@/lib/graph/types";

export type GraphMapperState = {
  controlY1: number;
  controlY2: number;
  graphType: GraphMapperType;
  xMax: number;
  xMin: number;
  yMax: number;
  yMin: number;
};

export function evaluateNormalizedGraph(type: GraphMapperType, t: number, controlY1: number, controlY2: number) {
  const clamped = Math.min(Math.max(t, 0), 1);
  if (type === "linear") return clamped;
  if (type === "sine") return 0.5 - 0.5 * Math.cos(Math.PI * clamped);
  if (type === "gaussian") {
    const sigma = 0.18;
    return Math.exp(-((clamped - 0.5) ** 2) / (2 * sigma ** 2));
  }
  const inverse = 1 - clamped;
  return (
    3 * inverse * inverse * clamped * controlY1 +
    3 * inverse * clamped * clamped * controlY2 +
    clamped ** 3
  );
}
