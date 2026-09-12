"use client";

import { useMemo, useState, type PointerEvent } from "react";

import { TabbedCatalog } from "@/components/organisms/TabbedCatalog";
import { compareCategories, compareComponents, sortedTabs } from "@/lib/graph/catalogOrder";
import { componentDisplayName, componentNickname, type PyhopperComponentDefinition } from "@/lib/graph/types";

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

function matchesFilter(definition: PyhopperComponentDefinition, query: string): boolean {
  if (!query) {
    return true;
  }
  return [componentDisplayName(definition), componentNickname(definition) ?? "", definition.component, definition.category].some(
    (field) => field.toLowerCase().includes(query),
  );
}

export function ComponentBrowser({
  components,
  onPlacementPointerDown,
  onPlacementPointerMove,
  onPlacementPointerUp,
}: ComponentBrowserProps) {
  const tabs = useMemo(() => sortedTabs(components), [components]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();

  const tabCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const definition of components) {
      counts.set(definition.tab, (counts.get(definition.tab) ?? 0) + 1);
    }
    return counts;
  }, [components]);

  const groups = useMemo(() => {
    if (!activeTab) {
      return [];
    }

    const grouped = new Map<string, PyhopperComponentDefinition[]>();

    for (const definition of components) {
      if (definition.tab !== activeTab || !matchesFilter(definition, query)) {
        continue;
      }

      const current = grouped.get(definition.category) ?? [];
      current.push(definition);
      grouped.set(definition.category, current);
    }

    return Array.from(grouped.entries())
      .map<CategoryGroup>(([category, groupedComponents]) => ({
        category,
        components: [...groupedComponents].sort(compareComponents),
      }))
      .sort((a, b) => compareCategories(activeTab, a.category, b.category));
  }, [activeTab, components, query]);

  return (
    <TabbedCatalog
      activeTab={activeTab}
      filter={filter}
      groups={groups.map((group) => ({
        id: group.category,
        items: group.components.map((definition) => ({
          id: `${definition.tab}-${definition.category}-${definition.component}`,
          label: componentDisplayName(definition),
          nickname: componentNickname(definition),
          onPointerDown: (event) => onPlacementPointerDown(definition, event),
          onPointerMove: (event) => onPlacementPointerMove(definition, event),
          onPointerUp: (event) => onPlacementPointerUp(definition, event),
          title: [definition.description, `${definition.tab} › ${definition.category} · ${definition.component}`].filter(Boolean).join("\n"),
        })),
        title: group.category,
      }))}
      onFilterChange={setFilter}
      onToggleTab={(tabId) => {
        setActiveTab((current) => (current === tabId ? null : tabId));
        setFilter("");
      }}
      tabs={tabs.map((tab) => ({ id: tab, label: tab, count: tabCounts.get(tab) ?? 0 }))}
    />
  );
}
