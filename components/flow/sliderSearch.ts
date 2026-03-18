"use client";

import type { PyhopperComponentDefinition } from "@/components/flow/types";

const NUMBER_PATTERN = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

function isNumericToken(value: string) {
  return NUMBER_PATTERN.test(value.trim());
}

function decimalPlaces(value: string) {
  const trimmed = value.trim();
  const decimalIndex = trimmed.indexOf(".");

  if (decimalIndex === -1) {
    return 0;
  }

  return trimmed.length - decimalIndex - 1;
}

function nextPowerOfTen(value: number) {
  const magnitude = Math.abs(value);

  if (magnitude === 0) {
    return 1;
  }

  return 10 ** (Math.floor(Math.log10(magnitude)) + 1);
}

function sliderStep(decimals: number) {
  return decimals > 0 ? 10 ** (-decimals) : 1;
}

function sliderFromSingleValue(value: number, decimals: number) {
  const extent = nextPowerOfTen(value);

  if (value >= 0) {
    return {
      min: 0,
      max: extent,
      value,
      step: sliderStep(decimals),
      decimals,
    };
  }

  return {
    min: -extent,
    max: 0,
    value,
    step: sliderStep(decimals),
    decimals,
  };
}

function sliderFromRange(min: number, max: number, decimals: number) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  return {
    min: lower,
    max: upper,
    value: lower,
    step: sliderStep(decimals),
    decimals,
  };
}

function sliderFromExplicitRange(min: number, value: number, max: number, decimals: number) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  return {
    min: lower,
    max: upper,
    value: Math.min(Math.max(value, lower), upper),
    step: sliderStep(decimals),
    decimals,
  };
}

export function buildSliderSearchDefinition(
  query: string,
  sliderDefinition: PyhopperComponentDefinition | undefined,
): PyhopperComponentDefinition | null {
  if (!sliderDefinition) {
    return null;
  }

  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  if (isNumericToken(trimmed)) {
    const value = Number(trimmed);
    const decimals = decimalPlaces(trimmed);

    return {
      ...sliderDefinition,
      frontend_config: sliderFromSingleValue(value, decimals),
    };
  }

  const parts = trimmed.split("<").map((part) => part.trim());

  if (parts.length === 2 && parts.every(isNumericToken)) {
    const decimals = Math.max(...parts.map(decimalPlaces));
    const [min, max] = parts.map(Number);

    return {
      ...sliderDefinition,
      frontend_config: sliderFromRange(min, max, decimals),
    };
  }

  if (parts.length === 3 && parts.every(isNumericToken)) {
    const decimals = Math.max(...parts.map(decimalPlaces));
    const [min, value, max] = parts.map(Number);

    return {
      ...sliderDefinition,
      frontend_config: sliderFromExplicitRange(min, value, max, decimals),
    };
  }

  return null;
}
