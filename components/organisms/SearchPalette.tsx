"use client";

import { SearchInput } from "@/components/atoms/SearchInput";

type SearchPaletteItem = {
  id: string;
  label: string;
  metadata?: string;
  title?: string;
};

type SearchPaletteProps = {
  activeIndex: number;
  emptyLabel: string;
  /** Shown under the results, e.g. how many matches were left out. */
  footer?: string;
  isOpen: boolean;
  items: SearchPaletteItem[];
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (index: number) => void;
  placeholder: string;
  query: string;
  x: number;
  y: number;
};

export function SearchPalette({
  activeIndex,
  emptyLabel,
  footer,
  isOpen,
  items,
  onActiveIndexChange,
  onClose,
  onQueryChange,
  onSelect,
  placeholder,
  query,
  x,
  y,
}: SearchPaletteProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="component-search"
      style={{
        left: Math.max(8, x),
        top: y,
      }}
    >
      <SearchInput
        autoFocus
        className="component-search__input"
        onChange={(event) => {
          onQueryChange(event.target.value);
          onActiveIndexChange(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            onActiveIndexChange(Math.min(activeIndex + 1, Math.max(items.length - 1, 0)));
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            onActiveIndexChange(Math.max(activeIndex - 1, 0));
            return;
          }

          if (event.key === "Enter" && items[activeIndex]) {
            event.preventDefault();
            onSelect(activeIndex);
          }
        }}
        placeholder={placeholder}
        value={query}
      />

      <div className="component-search__results">
        {items.length ? (
          items.map((item, index) => (
            <button
              className={`component-search__item${index === activeIndex ? " component-search__item--active" : ""}`}
              key={item.id}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onActiveIndexChange(index)}
              title={item.title}
              type="button"
            >
              <p className="component-search__name">{item.label}</p>
              {item.metadata ? <span className="component-search__metadata">{item.metadata}</span> : null}
            </button>
          ))
        ) : (
          <div className="component-search__empty">{emptyLabel}</div>
        )}
      </div>
      {footer ? <div className="component-search__footer">{footer}</div> : null}
    </div>
  );
}
