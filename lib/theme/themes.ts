export type ThemeId =
  | "vellum-light"
  | "vellum-dark"
  | "vellum-contrast"
  | "instrument-light"
  | "instrument-dark"
  | "instrument-contrast"
  | "grasshopper";

export type ThemeMode = "light" | "dark" | "contrast";

export type ThemeDefinition = {
  family: "vellum" | "instrument" | "grasshopper";
  id: ThemeId;
  label: string;
  mode: ThemeMode;
  monacoTheme: "vs" | "vs-dark" | "hc-black";
};

export const DEFAULT_THEME_ID: ThemeId = "vellum-light";
export const THEME_STORAGE_KEY = "pyhopper.theme.v1";

export const themeOptions: ThemeDefinition[] = [
  {
    family: "vellum",
    id: "vellum-light",
    label: "Vellum Light",
    mode: "light",
    monacoTheme: "vs",
  },
  {
    family: "vellum",
    id: "vellum-dark",
    label: "Vellum Dark",
    mode: "dark",
    monacoTheme: "vs-dark",
  },
  {
    family: "vellum",
    id: "vellum-contrast",
    label: "Vellum Contrast",
    mode: "contrast",
    monacoTheme: "hc-black",
  },
  {
    family: "instrument",
    id: "instrument-light",
    label: "Instrument Light",
    mode: "light",
    monacoTheme: "vs",
  },
  {
    family: "instrument",
    id: "instrument-dark",
    label: "Instrument Dark",
    mode: "dark",
    monacoTheme: "vs-dark",
  },
  {
    family: "instrument",
    id: "instrument-contrast",
    label: "Instrument Contrast",
    mode: "contrast",
    monacoTheme: "hc-black",
  },
  {
    family: "grasshopper",
    id: "grasshopper",
    label: "Grasshopper",
    mode: "light",
    monacoTheme: "vs",
  },
];

export function isThemeId(value: string): value is ThemeId {
  return themeOptions.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeOptions.find((theme) => theme.id === themeId) ?? themeOptions[0];
}