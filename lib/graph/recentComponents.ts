const STORAGE_KEY = "pyhopper.recentComponents";
const LIMIT = 8;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

/** Component keys most recently placed from the search palette, newest first (per browser). */
export function recentComponentKeys(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  return read();
}

export function rememberComponent(componentKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = [componentKey, ...read().filter((key) => key !== componentKey)].slice(0, LIMIT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage may be unavailable (private mode, quota); recents are a convenience only
  }
}
