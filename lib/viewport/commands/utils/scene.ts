import type { ViewportCommandState } from "../types";

export function createEmptyViewportCommandState(): ViewportCommandState {
  return {
    draftPoints: [],
    hoverPoint: null,
  };
}
