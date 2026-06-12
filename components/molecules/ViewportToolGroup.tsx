"use client";

import type { ReactNode } from "react";

import { ViewportToolButton } from "@/components/molecules/ViewportToolButton";

type ViewportToolGroupProps = {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function ViewportToolGroup({
  active,
  children,
  icon,
  label,
  onClick,
}: ViewportToolGroupProps) {
  return (
    <div className="viewport-tool-group">
      <ViewportToolButton active={active} label={label} onClick={onClick}>
        {icon}
      </ViewportToolButton>
      <div className="viewport-tool-group__flyout">
        <div aria-label={`${label} commands`} className="viewport-tool-group__panel" role="toolbar">
          {children}
        </div>
      </div>
    </div>
  );
}
