"use client";

import { CatalogCard } from "@/components/molecules/CatalogCard";
import { CatalogTabButton } from "@/components/molecules/CatalogTabButton";

type TabbedCatalogTab = {
  id: string;
  label: string;
};

type TabbedCatalogItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

type TabbedCatalogGroup = {
  id: string;
  items: TabbedCatalogItem[];
  title: string;
};

type TabbedCatalogProps = {
  activeTab: string | null;
  groups: TabbedCatalogGroup[];
  onToggleTab: (tabId: string) => void;
  tabs: TabbedCatalogTab[];
};

export function TabbedCatalog({ activeTab, groups, onToggleTab, tabs }: TabbedCatalogProps) {
  return (
    <section className="component-browser">
      <div className="component-browser__tabs">
        {tabs.map((tab) => (
          <CatalogTabButton
            active={activeTab === tab.id}
            activeClassName="component-browser__tab--active"
            className="component-browser__tab"
            key={tab.id}
            label={tab.label}
            onClick={() => onToggleTab(tab.id)}
          />
        ))}
      </div>

      {activeTab ? (
        <div className="component-browser__panel">
          <div className="component-browser__rail">
            {groups.map((group) => (
              <section className="component-browser__category" key={group.id}>
                <header className="component-browser__category-header">
                  <h3 className="component-browser__category-title">{group.title}</h3>
                </header>

                <div className="component-browser__grid">
                  {group.items.map((item) => (
                    <CatalogCard
                      className="component-browser__card"
                      key={item.id}
                      label={item.label}
                      onClick={item.onSelect}
                    />
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