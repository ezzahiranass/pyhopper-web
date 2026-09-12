"use client";

import { useMemo, useState, type PointerEvent } from "react";

import { TabbedCatalog } from "@/components/organisms/TabbedCatalog";
import type { PyhopperComponentDefinition } from "@/lib/graph/types";

type ComponentBrowserProps = {
  components: PyhopperComponentDefinition[];
  onPlacementPointerDown: (definition: PyhopperComponentDefinition, event: PointerEvent<HTMLButtonElement>) => void;
  onPlacementPointerMove: (definition: PyhopperComponentDefinition, event: PointerEvent<HTMLButtonElement>) => void;
  onPlacementPointerUp: (definition: PyhopperComponentDefinition, event: PointerEvent<HTMLButtonElement>) => void;
};

type CategoryGroup = {
  category: string;
  components: PyhopperComponentDefinition[];
};

export function ComponentBrowser({
  components,
  onPlacementPointerDown,
  onPlacementPointerMove,
  onPlacementPointerUp,
}: ComponentBrowserProps) {
  const tabs = useMemo(() => Array.from(new Set(components.map((item) => item.tab))), [components]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!activeTab) {
      return [];
    }

    const grouped = new Map<string, PyhopperComponentDefinition[]>();

    for (const definition of components) {
      if (definition.tab !== activeTab) {
        continue;
      }

      const current = grouped.get(definition.category) ?? [];
      current.push(definition);
      grouped.set(definition.category, current);
    }

    return Array.from(grouped.entries())
      .map<CategoryGroup>(([category, groupedComponents]) => ({
        category,
        components: groupedComponents,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [activeTab, components]);

  return (
    <TabbedCatalog
      activeTab={activeTab}
      groups={groups.map((group) => ({
        id: group.category,
        items: group.components.map((definition) => ({
          id: `${definition.tab}-${definition.category}-${definition.component}`,
          label: definition.component,
          onPointerDown: (event) => onPlacementPointerDown(definition, event),
          onPointerMove: (event) => onPlacementPointerMove(definition, event),
          onPointerUp: (event) => onPlacementPointerUp(definition, event),
        })),
        title: group.category,
      }))}
      onToggleTab={(tabId) => setActiveTab((current) => (current === tabId ? null : tabId))}
      tabs={tabs.map((tab) => ({ id: tab, label: tab }))}
    />
  );
}
