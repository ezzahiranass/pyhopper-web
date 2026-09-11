"use client";

import type { ReactNode } from "react";

type FloatingActionPanelProps = {
  children: ReactNode;
  className?: string;
};

export function FloatingActionPanel({ children, className = "" }: FloatingActionPanelProps) {
  return <div className={`floating-action-panel${className ? ` ${className}` : ""}`}>{children}</div>;
}
