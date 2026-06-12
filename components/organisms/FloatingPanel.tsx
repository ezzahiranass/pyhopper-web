"use client";

import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Minimize, ScanLine, SquareSplitHorizontal, SquareSplitVertical } from "lucide-react";
import { ResizableBox, type ResizeCallbackData } from "react-resizable";

import { IconButton } from "@/components/atoms/IconButton";

type PanelState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const defaultPanelState: PanelState = {
  x: 56,
  y: 56,
  width: 560,
  height: 360,
};

export type PanelLayout = "floating" | "split-horizontal" | "split-vertical";

type FloatingPanelProps = {
  children: ReactNode;
  headerContent?: ReactNode;
  layout?: PanelLayout;
  onLayoutChange?: (layout: PanelLayout) => void;
  overlay?: ReactNode;
};

export function FloatingPanel({
  children,
  headerContent,
  layout = "floating",
  onLayoutChange,
  overlay,
}: FloatingPanelProps) {
  const isSplit = layout !== "floating";
  const [panelState, setPanelState] = useState(defaultPanelState);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const popoutWindow = useRef<Window | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelStateRef = useRef(defaultPanelState);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const previousState = useRef(defaultPanelState);

  useEffect(() => {
    panelStateRef.current = panelState;
  }, [panelState]);

  useEffect(() => {
    if (!isMaximized) {
      return;
    }

    const handleResize = () => {
      const nextState = {
        x: 24,
        y: 24,
        width: window.innerWidth - 48,
        height: window.innerHeight - 48,
      };
      panelStateRef.current = nextState;
      setPanelState(nextState);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [isMaximized]);

  useEffect(() => {
    if (!isPoppedOut) {
      return;
    }

    const interval = setInterval(() => {
      if (popoutWindow.current?.closed) {
        popoutWindow.current = null;
        setIsPoppedOut(false);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isPoppedOut]);

  const clampPosition = (nextX: number, nextY: number) => {
    const width = isMaximized ? window.innerWidth - 48 : panelStateRef.current.width;
    const height = isMaximized ? window.innerHeight - 48 : panelStateRef.current.height;

    return {
      x: Math.min(Math.max(12, nextX), window.innerWidth - width - 12),
      y: Math.min(Math.max(12, nextY), window.innerHeight - (isMinimized ? 48 : height) - 12),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMaximized || isSplit) {
      return;
    }

    setIsDragging(true);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panelStateRef.current.x,
      originY: panelStateRef.current.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrag = dragState.current;

    if (!activeDrag || activeDrag.pointerId !== event.pointerId || isMaximized) {
      return;
    }

    const nextX = activeDrag.originX + (event.clientX - activeDrag.startX);
    const nextY = activeDrag.originY + (event.clientY - activeDrag.startY);

    setPanelState((current) => ({
      ...current,
      ...clampPosition(nextX, nextY),
    }));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResize = (_event: unknown, data: ResizeCallbackData) => {
    setPanelState((current) => {
      const nextState = {
        ...current,
        width: data.size.width,
        height: data.size.height,
      };
      panelStateRef.current = nextState;
      return nextState;
    });
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      panelStateRef.current = previousState.current;
      setPanelState(previousState.current);
      setIsMaximized(false);
      return;
    }

    previousState.current = panelStateRef.current;
    onLayoutChange?.("floating");
    setIsMaximized(true);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    if (isSplit) {
      onLayoutChange?.("floating");
      setIsMinimized(true);
      return;
    }
    setIsMinimized((value) => !value);
  };

  const toggleSplit = (nextLayout: Exclude<PanelLayout, "floating">) => {
    const resolvedLayout = layout === nextLayout ? "floating" : nextLayout;
    if (resolvedLayout !== "floating") {
      setIsMinimized(false);
      setIsMaximized(false);
    }
    onLayoutChange?.(resolvedLayout);
  };

  const handlePopOut = () => {
    if (isPoppedOut && popoutWindow.current && !popoutWindow.current.closed) {
      popoutWindow.current.focus();
      return;
    }

    const win = window.open("/canvas", "pyhopper-flow-popout", "popup=yes,width=1100,height=760");

    if (win) {
      popoutWindow.current = win;
      setIsPoppedOut(true);
      setIsMinimized(false);
      setIsMaximized(false);
      onLayoutChange?.("floating");
    }
  };

  if (isPoppedOut) {
    return null;
  }

  const shellStyle = { left: panelState.x, top: panelState.y };

  const panelActions = (maximizeLabel: string, maximizeIcon: ReactNode) => (
    <div className="floating-panel__actions" onPointerDown={(event) => event.stopPropagation()}>
      <IconButton
        className="floating-panel__action-button"
        label={isMinimized ? "Expand panel" : "Minimize panel"}
        onClick={toggleMinimize}
      >
        {isMinimized ? <ScanLine size={16} /> : <Minimize size={16} />}
      </IconButton>
      <IconButton className="floating-panel__action-button" label="Pop out canvas" onClick={handlePopOut}>
        <ExternalLink size={16} />
      </IconButton>
      <IconButton
        aria-pressed={layout === "split-vertical"}
        className={`floating-panel__action-button${layout === "split-vertical" ? " floating-panel__action-button--active" : ""}`}
        label={layout === "split-vertical" ? "Restore floating canvas" : "Split vertically"}
        onClick={() => toggleSplit("split-vertical")}
      >
        <SquareSplitHorizontal size={16} />
      </IconButton>
      <IconButton
        aria-pressed={layout === "split-horizontal"}
        className={`floating-panel__action-button${layout === "split-horizontal" ? " floating-panel__action-button--active" : ""}`}
        label={layout === "split-horizontal" ? "Restore floating canvas" : "Split horizontally"}
        onClick={() => toggleSplit("split-horizontal")}
      >
        <SquareSplitVertical size={16} />
      </IconButton>
      <IconButton className="floating-panel__action-button" label={maximizeLabel} onClick={toggleMaximize}>
        {maximizeIcon}
      </IconButton>
    </div>
  );

  const panelHeader = (maximizeLabel: string, maximizeIcon: ReactNode) => (
    <div className="floating-panel__header" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      {headerContent ?? (
        <div>
          <p className="floating-panel__eyebrow">PYHOPPER</p>
          <h2 className="floating-panel__title">Canvas</h2>
        </div>
      )}
      {panelActions(maximizeLabel, maximizeIcon)}
    </div>
  );

  if (isSplit) {
    return (
      <section className="floating-panel floating-panel--split" data-layout={layout}>
        {panelHeader("Maximize panel", <Maximize2 size={16} />)}
        <div className="floating-panel__body">{children}{overlay}</div>
      </section>
    );
  }

  if (isMaximized) {
    return (
      <section className={`floating-panel${isMinimized ? " floating-panel--minimized" : ""}`} style={{ left: 24, top: 24, width: "calc(100vw - 48px)", height: "calc(100vh - 48px)" }}>
        {panelHeader("Restore panel", <Minimize2 size={16} />)}
        {!isMinimized ? <div className="floating-panel__body">{children}{overlay}</div> : null}
      </section>
    );
  }

  return (
    <ResizableBox
      axis="both"
      className={`floating-panel-shell${isDragging ? " floating-panel-shell--dragging" : ""}`}
      draggableOpts={{ enableUserSelectHack: false }}
      height={isMinimized ? 48 : panelState.height}
      minConstraints={[360, 240]}
      onResize={handleResize}
      onResizeStop={handleResize}
      resizeHandles={isMinimized ? [] : ["e", "s", "se"]}
      style={shellStyle}
      width={panelState.width}
    >
      <section className={`floating-panel${isMinimized ? " floating-panel--minimized" : ""}`} ref={panelRef}>
        {panelHeader("Maximize panel", <Maximize2 size={16} />)}
        {!isMinimized ? <div className="floating-panel__body">{children}{overlay}</div> : null}
      </section>
    </ResizableBox>
  );
}
