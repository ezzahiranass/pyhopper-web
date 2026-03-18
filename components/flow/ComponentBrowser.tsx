"use client";

import { useMemo, useState } from "react";

import type { PyhopperComponentDefinition } from "@/components/flow/types";

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
    <section className="component-browser">
      <div className="component-browser__tabs">
        {tabs.map((tab) => (
          <button
            className={`component-browser__tab${activeTab === tab ? " component-browser__tab--active" : ""}`}
            key={tab}
            onClick={() => setActiveTab((current) => (current === tab ? null : tab))}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab ? (
        <div className="component-browser__panel">
          <div className="component-browser__rail">
            {groups.map((group) => (
              <section className="component-browser__category" key={group.category}>
                <header className="component-browser__category-header">
                  <h3 className="component-browser__category-title">{group.category}</h3>
                </header>

                <div className="component-browser__grid">
                  {group.components.map((definition) => (
                    <button
                      className="component-browser__card"
                      key={`${definition.tab}-${definition.category}-${definition.component}`}
                      onClick={() => onSelect(definition)}
                      type="button"
                    >
                      <p className="component-browser__card-title">{definition.component}</p>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
