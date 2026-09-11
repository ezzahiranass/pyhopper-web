"use client";

import type { PyhopperComponentDefinition } from "@/lib/graph/types";

export function buildPanelSearchDefinition(
  query: string,
  panelDefinition: PyhopperComponentDefinition | undefined,
): PyhopperComponentDefinition | null {
  const trimmedStart = query.trimStart();
  if (!panelDefinition || !trimmedStart.startsWith("//")) {
    return null;
  }

  return {
    ...panelDefinition,
    initial_values: {
      ...panelDefinition.initial_values,
      text: trimmedStart.slice(2),
      textAlign: "center",
    },
  };
}
