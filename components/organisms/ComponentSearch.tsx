"use client";

import { useMemo, useState } from "react";

import { SearchPalette } from "@/components/organisms/SearchPalette";
import { buildPanelSearchDefinition } from "@/lib/graph/panelSearch";
import { recentComponentKeys, rememberComponent } from "@/lib/graph/recentComponents";
import { buildSliderSearchDefinition } from "@/lib/graph/sliderSearch";
import { isSpecialComponent } from "@/lib/graph/specialComponents";
import { componentDisplayName, componentNickname, type PyhopperComponentDefinition } from "@/lib/graph/types";

/** Results shown at once; the footer says how many more a longer query would reach. */
const RESULT_LIMIT = 40;

function fieldMatchScore(value: string, query: string, weight: number) {
  const normalizedValue = value.toLowerCase();
  if (!normalizedValue.includes(query)) return 0;
  if (normalizedValue === query) return weight * 1.5;
  if (normalizedValue.startsWith(query)) return weight * 1.3;
  if (normalizedValue.split(/[\s._/-]+/).some((word) => word.startsWith(query))) return weight * 1.15;
  return weight;
}

/** Nicknames are short codes people type on purpose ("LLX", "Div"): exact and prefix only, and they outrank names. */
function nicknameScore(nickname: string | null, query: string) {
  if (!nickname) return 0;
  const normalized = nickname.toLowerCase();
  if (normalized === query) return 1800;
  if (normalized.startsWith(query)) return 1400;
  return 0;
}

function componentSearchScore(definition: PyhopperComponentDefinition, query: string) {
  const terms = query.split(/\s+/).filter(Boolean);
  const nickname = componentNickname(definition);
  let score = 0;

  for (const term of terms) {
    const nameScore = Math.max(
      nicknameScore(nickname, term),
      fieldMatchScore(componentDisplayName(definition), term, 1000),
      fieldMatchScore(definition.component, term, 900),
    );
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
  // re-read when the palette opens so a component placed a moment ago shows up as recent
  const recentKeys = useMemo(() => (isOpen ? recentComponentKeys() : []), [isOpen]);

  const numberSliderDefinition = useMemo(
    () => components.find((definition) => isSpecialComponent(definition, "numberSlider")),
    [components],
  );
  const panelDefinition = useMemo(
    () => components.find((definition) => isSpecialComponent(definition, "panel")),
    [components],
  );
  const sliderShortcutResult = useMemo(
    () => buildSliderSearchDefinition(query, numberSliderDefinition),
    [numberSliderDefinition, query],
  );
  const panelShortcutResult = useMemo(
    () => buildPanelSearchDefinition(query, panelDefinition),
    [panelDefinition, query],
  );

  const { results, hiddenCount } = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let componentMatches: PyhopperComponentDefinition[];
    if (!normalized) {
      // empty query: what this person placed recently, then the catalog in its own order
      const byKey = new Map(components.map((definition) => [definition.component_key, definition] as const));
      const recents = recentKeys.map((key) => byKey.get(key)).filter((definition): definition is PyhopperComponentDefinition => !!definition);
      componentMatches = [...recents, ...components.filter((definition) => !recents.includes(definition))];
    } else {
      componentMatches = components
        .map((definition, index) => ({
          definition,
          index,
          score: componentSearchScore(definition, normalized),
        }))
        .filter((result) => result.score > 0)
        .sort(
          (left, right) =>
            right.score - left.score ||
            componentDisplayName(left.definition).localeCompare(componentDisplayName(right.definition)) ||
            left.index - right.index,
        )
        .map((result) => result.definition);
    }

    const shortcuts = [
      ...(panelShortcutResult ? [panelShortcutResult] : []),
      ...(sliderShortcutResult ? [sliderShortcutResult] : []),
    ];
    const ordinary = componentMatches.filter(
      (definition) => definition !== panelShortcutResult && definition !== sliderShortcutResult,
    );
    const visible = ordinary.slice(0, RESULT_LIMIT);
    return { results: [...shortcuts, ...visible], hiddenCount: ordinary.length - visible.length };
  }, [components, panelShortcutResult, query, recentKeys, sliderShortcutResult]);

  const tooltipFor = (definition: PyhopperComponentDefinition) =>
    [
      `${definition.tab} > ${definition.category} > ${componentDisplayName(definition)}${componentNickname(definition) ? ` (${componentNickname(definition)})` : ""}`,
      definition.description,
      isSpecialComponent(definition, "numberSlider") && query.trim()
        ? `Slider syntax: ${query.trim()}`
        : null,
      isSpecialComponent(definition, "panel") && query.trimStart().startsWith("//")
        ? `Panel text: ${query.trimStart().slice(2)}`
        : null,
      `${definition.variadic_inputs ? `${definition.input_count}+` : definition.input_count} in / ${definition.output_count} out`,
    ]
      .filter(Boolean)
      .join("\n");

  if (!isOpen) {
    return null;
  }

  const recentSet = new Set(recentKeys);

  return (
    <SearchPalette
      activeIndex={activeIndex}
      emptyLabel="No components match this query."
      footer={hiddenCount > 0 ? `${hiddenCount} more — keep typing to narrow the list` : undefined}
      isOpen={isOpen}
      items={results.map((definition) => ({
        id: `${definition.component_key}-${definition.initial_settings?.min ?? "base"}-${definition.initial_settings?.value ?? "base"}-${definition.initial_settings?.max ?? "base"}-${definition.initial_values?.text ?? "base"}`,
        label: componentDisplayName(definition),
        metadata: [
          componentNickname(definition),
          `${definition.tab} > ${definition.category}`,
          !query.trim() && recentSet.has(definition.component_key) ? "recent" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        title: tooltipFor(definition),
      }))}
      onActiveIndexChange={setActiveIndex}
      onClose={onClose}
      onQueryChange={setQuery}
      onSelect={(index) => {
        const definition = results[index];
        if (definition) {
          rememberComponent(definition.component_key);
          onSelect(definition);
        }
      }}
      placeholder={`Search ${components.length} components — name, nickname (LLX, Div), port or category`}
      query={query}
      x={x}
      y={y}
    />
  );
}
