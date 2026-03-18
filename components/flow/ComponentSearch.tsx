"use client";

import { useMemo, useState } from "react";

import { buildSliderSearchDefinition } from "@/components/flow/sliderSearch";
import type { PyhopperComponentDefinition } from "@/components/flow/types";

type ComponentSearchProps = {
  components: PyhopperComponentDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (definition: PyhopperComponentDefinition) => void;
  x: number;
  y: number;
};

export function ComponentSearch({
  components,
  isOpen,
  onClose,
  onSelect,
  x,
  y,
}: ComponentSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const numberSliderDefinition = useMemo(
    () =>
      components.find(
        (definition) =>
          definition.component === "NumberSlider" && definition.frontend_preset === "number-slider",
      ),
    [components],
  );
  const sliderShortcutResult = useMemo(
    () => buildSliderSearchDefinition(query, numberSliderDefinition),
    [numberSliderDefinition, query],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const componentMatches = !normalized
      ? components.slice(0, 10)
      : components
          .filter((definition) =>
            [definition.component, definition.tab, definition.category, definition.description]
              .join(" ")
              .toLowerCase()
              .includes(normalized),
          )
          .slice(0, 10);

    if (sliderShortcutResult) {
      return [sliderShortcutResult, ...componentMatches].slice(0, 10);
    }

    return componentMatches;
  }, [components, query, sliderShortcutResult]);

  const tooltipFor = (definition: PyhopperComponentDefinition) =>
    [
      `${definition.tab} > ${definition.category} > ${definition.component}`,
      definition.description,
      definition.frontend_preset === "number-slider" && query.trim()
        ? `Slider syntax: ${query.trim()}`
        : null,
      `${definition.variadic_inputs ? `${definition.input_count}+` : definition.input_count} in / ${definition.output_count} out`,
    ]
      .filter(Boolean)
      .join("\n");

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
      <input
        autoFocus
        className="component-search__input"
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
          }

          if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            onSelect(results[activeIndex]);
          }
        }}
        placeholder="Search components"
        value={query}
      />

      <div className="component-search__results">
        {results.length ? (
          results.map((definition, index) => (
            <button
              className={`component-search__item${index === activeIndex ? " component-search__item--active" : ""}`}
              key={`${definition.tab}-${definition.category}-${definition.component}-${definition.frontend_config?.min ?? "base"}-${definition.frontend_config?.value ?? "base"}-${definition.frontend_config?.max ?? "base"}`}
              onClick={() => onSelect(definition)}
              onMouseEnter={() => setActiveIndex(index)}
              title={tooltipFor(definition)}
              type="button"
            >
              <p className="component-search__name">{definition.component}</p>
            </button>
          ))
        ) : (
          <div className="component-search__empty">No components match this query.</div>
        )}
      </div>
    </div>
  );
}
