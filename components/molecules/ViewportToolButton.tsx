"use client";

import { type ReactNode } from "react";

import { IconButton } from "@/components/atoms/IconButton";

type ViewportToolButtonProps = {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
};

export function ViewportToolButton({ active, children, label, onClick }: ViewportToolButtonProps) {
  return (
    <IconButton
      aria-pressed={active}
      className={`viewport-tool-button${active ? " viewport-tool-button--active" : ""}`}
      label={label}
      onClick={onClick}
    >
      {children}
    </IconButton>
  );
}
