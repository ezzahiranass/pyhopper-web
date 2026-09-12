"use client";

import { useMemo, useState } from "react";

import { SearchPalette } from "@/components/organisms/SearchPalette";
import { buildPanelSearchDefinition } from "@/lib/graph/panelSearch";
import { buildSliderSearchDefinition } from "@/lib/graph/sliderSearch";
import type { PyhopperComponentDefinition } from "@/lib/graph/types";

function fieldMatchScore(value: string, query: string, weight: number) {
  const normalizedValue = value.toLowerCase();
  if (!normalizedValue.includes(query)) return 0;
  if (normalizedValue === query) return weight * 1.5;
  if (normalizedValue.startsWith(query)) return weight * 1.3;
  if (normalizedValue.split(/[\s._/-]+/).some((word) => word.startsWith(query))) return weight * 1.15;
  return weight;
}

function componentSearchScore(definition: PyhopperComponentDefinition, query: string) {
  const terms = query.split(/\s+/).filter(Boolean);
  let score = 0;

  for (const term of terms) {
    const nameScore = fieldMatchScore(definition.component, term, 1000);
    const descriptionScore = fieldMatchScore(definition.description, term, 500);
    const portScore = Math.max(
      ...[...definition.inputs, ...definition.outputs].map((port) =>
        fieldMatchScore(
          [
            port.name,
            port.type,
            ...(port.accepts ?? []),
            port.access,
            port.optional ? "optional" : null,
            port.default !== undefined ? String(port.default) : null,
          ]
            .filter(Boolean)
            .join(" "),
          term,
          250,
        ),
      ),
      0,
    );
    const metadataScore = Math.max(
      fieldMatchScore(definition.tab, term, 120),
      fieldMatchScore(definition.category, term, 120),
      fieldMatchScore(definition.component_key, term, 80),
    );
    const termScore = Math.max(nameScore, descriptionScore, portScore, metadataScore);

    if (!termScore) return 0;
    score += termScore;
  }

  return score;
}

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
    () => components.find((definition) => definition.component === "NumberSlider"),
    [components],
  );
  const panelDefinition = useMemo(() => components.find((definition) => definition.component === "Panel"), [components]);
  const sliderShortcutResult = useMemo(
    () => buildSliderSearchDefinition(query, numberSliderDefinition),
    [numberSliderDefinition, query],
  );
  const panelShortcutResult = useMemo(
    () => buildPanelSearchDefinition(query, panelDefinition),
    [panelDefinition, query],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const componentMatches = !normalized
      ? components
      : components
          .map((definition, index) => ({
            definition,
            index,
            score: componentSearchScore(definition, normalized),
          }))
          .filter((result) => result.score > 0)
          .sort(
            (left, right) =>
              right.score - left.score ||
              left.definition.component.localeCompare(right.definition.component) ||
              left.index - right.index,
          )
          .map((result) => result.definition);

    return [
      ...(panelShortcutResult ? [panelShortcutResult] : []),
      ...(sliderShortcutResult ? [sliderShortcutResult] : []),
      ...componentMatches.filter(
        (definition) =>
          definition !== panelShortcutResult && definition !== sliderShortcutResult,
      ),
    ];
  }, [components, panelShortcutResult, query, sliderShortcutResult]);

  const tooltipFor = (definition: PyhopperComponentDefinition) =>
    [
      `${definition.tab} > ${definition.category} > ${definition.component}`,
      definition.description,
      definition.component === "NumberSlider" && query.trim()
        ? `Slider syntax: ${query.trim()}`
        : null,
      definition.component === "Panel" && query.trimStart().startsWith("//")
        ? `Panel text: ${query.trimStart().slice(2)}`
        : null,
      `${definition.variadic_inputs ? `${definition.input_count}+` : definition.input_count} in / ${definition.output_count} out`,
    ]
      .filter(Boolean)
      .join("\n");

  if (!isOpen) {
    return null;
  }

  return (
    <SearchPalette
      activeIndex={activeIndex}
      emptyLabel="No components match this query."
      isOpen={isOpen}
      items={results.map((definition) => ({
        id: `${definition.tab}-${definition.category}-${definition.component}-${definition.initial_settings?.min ?? "base"}-${definition.initial_settings?.value ?? "base"}-${definition.initial_settings?.max ?? "base"}-${definition.initial_values?.text ?? "base"}`,
        label: definition.component,
        metadata: `${definition.tab} > ${definition.category}`,
        title: tooltipFor(definition),
      }))}
      onActiveIndexChange={setActiveIndex}
      onClose={onClose}
      onQueryChange={setQuery}
      onSelect={(index) => {
        const definition = results[index];
        if (definition) {
          onSelect(definition);
        }
      }}
      placeholder={`Searching ${components.length} components`}
      query={query}
      x={x}
      y={y}
    />
  );
}
