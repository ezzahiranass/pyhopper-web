"use client";

import type { PointerEvent } from "react";

type CatalogCardProps = {
  className?: string;
  label: string;
  nickname?: string;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  title?: string;
};
export function CatalogCard({
  className,
  label,
  nickname,
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
      {nickname ? <span className="component-browser__card-nick">{nickname}</span> : null}
    </button>
  );
}
