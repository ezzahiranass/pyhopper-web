"use client";

import { useEffect, useState } from "react";

export function useThemeToken(token: string, fallback: string): string {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const root = document.documentElement;
    const readToken = () => {
      setValue(getComputedStyle(root).getPropertyValue(token).trim() || fallback);
    };
    const observer = new MutationObserver(readToken);

    readToken();
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "style"] });
    return () => observer.disconnect();
  }, [fallback, token]);

  return value;
}
