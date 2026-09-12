"use client";

import type { ReactNode } from "react";

type FloatingActionPanelHeaderProps = {
  actions?: ReactNode;
  meta?: string;
  title: string;
};

export function FloatingActionPanelHeader({ actions, meta, title }: FloatingActionPanelHeaderProps) {
  return (
    <header className="floating-action-panel__header">
      <div className="floating-action-panel__header-copy">
        <p className="floating-action-panel__title">{title}</p>
        {meta ? <p className="floating-action-panel__meta">{meta}</p> : null}
      </div>
      {actions ? <div className="floating-action-panel__header-actions">{actions}</div> : null}
    </header>
  );
}
