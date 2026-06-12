"use client";

import { useMemo, useState } from "react";

import { TabbedCatalog } from "@/components/organisms/TabbedCatalog";
import type { PyhopperComponentDefinition } from "@/lib/graph/types";

type ComponentBrowserProps = {
  components: PyhopperComponentDefinition[];
  onSelect: (definition: PyhopperComponentDefinition) => void;
};

type CategoryGroup = {
  category: string;
  components: PyhopperComponentDefinition[];
};

export function ComponentBrowser({ components, onSelect }: ComponentBrowserProps) {
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
          onSelect: () => onSelect(definition),
        })),
        title: group.category,
      }))}
      onToggleTab={(tabId) => setActiveTab((current) => (current === tabId ? null : tabId))}
      tabs={tabs.map((tab) => ({ id: tab, label: tab }))}
    />
  );
}