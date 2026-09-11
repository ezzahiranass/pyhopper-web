"use client";

import type { PointerEvent } from "react";

type CatalogCardProps = {
  className?: string;
  label: string;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  title?: string;
};
export function CatalogCard({
  className,
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  title,
}: CatalogCardProps) {
  return (
    <button
      className={className}
      onPointerCancel={onPointerUp}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointerDown(event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        onPointerUp(event);
      }}
      title={title}
      type="button"
    >
      <span className="component-browser__card-title">{label}</span>
    </button>
  );
}
