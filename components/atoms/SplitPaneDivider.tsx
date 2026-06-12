"use client";

import type { KeyboardEvent, PointerEvent } from "react";

type SplitPaneDividerProps = {
  orientation: "horizontal" | "vertical";
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  valueNow: number;
};

export function SplitPaneDivider({
  orientation,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  valueNow,
}: SplitPaneDividerProps) {
  return (
    <div
      aria-label="Resize viewport and canvas"
      aria-orientation={orientation}
      aria-valuemax={80}
      aria-valuemin={20}
      aria-valuenow={Math.round(valueNow)}
      className="split-pane-divider"
      data-orientation={orientation}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="separator"
      tabIndex={0}
    >
      <span className="split-pane-divider__handle" />
    </div>
  );
}
