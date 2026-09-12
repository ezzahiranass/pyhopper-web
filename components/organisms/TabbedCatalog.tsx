"use client";

import type { PointerEvent } from "react";

import { SearchInput } from "@/components/atoms/SearchInput";
import { CatalogCard } from "@/components/molecules/CatalogCard";
import { CatalogTabButton } from "@/components/molecules/CatalogTabButton";

/** Categories with at least this many items get a wider column so they stay scannable. */
const WIDE_CATEGORY_THRESHOLD = 16;

type TabbedCatalogTab = {
  id: string;
  label: string;
  count?: number;
};

type TabbedCatalogItem = {
  id: string;
  label: string;
  nickname?: string | null;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  title?: string;
};

type TabbedCatalogGroup = {
  id: string;
  items: TabbedCatalogItem[];
  title: string;
};

type TabbedCatalogProps = {
  activeTab: string | null;
  filter?: string;
  groups: TabbedCatalogGroup[];
  onFilterChange?: (filter: string) => void;
  onToggleTab: (tabId: string) => void;
  tabs: TabbedCatalogTab[];
};

export function TabbedCatalog({ activeTab, filter = "", groups, onFilterChange, onToggleTab, tabs }: TabbedCatalogProps) {
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "";

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
            title={tab.count !== undefined ? `${tab.count} components` : undefined}
          />
        ))}
      </div>

      {activeTab ? (
        <div className="component-browser__panel">
          {onFilterChange ? (
            <div className="component-browser__filter">
              <SearchInput
                aria-label={`Filter ${activeLabel} components`}
                className="component-browser__filter-input"
                onChange={(event) => onFilterChange(event.target.value)}
                placeholder={`Filter ${activeLabel}…`}
                type="search"
                value={filter}
              />
            </div>
          ) : null}
          <div className="component-browser__rail">
            {groups.length ? (
              groups.map((group) => (
                <section
                  className={`component-browser__category${group.items.length >= WIDE_CATEGORY_THRESHOLD ? " component-browser__category--wide" : ""}`}
                  key={group.id}
                >
                  <header className="component-browser__category-header">
                    <h3 className="component-browser__category-title">{group.title}</h3>
                    <span className="component-browser__category-count">{group.items.length}</span>
                  </header>

                  <div className="component-browser__grid">
                    {group.items.map((item) => (
                      <CatalogCard
                        className="component-browser__card"
                        key={item.id}
                        label={item.label}
                        nickname={item.nickname ?? undefined}
                        onPointerDown={item.onPointerDown}
                        onPointerMove={item.onPointerMove}
                        onPointerUp={item.onPointerUp}
                        title={item.title}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p className="component-browser__empty">No {activeLabel} component matches “{filter.trim()}”.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
