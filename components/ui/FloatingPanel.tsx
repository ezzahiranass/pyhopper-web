"use client";

import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { ResizableBox, type ResizeCallbackData } from "react-resizable";

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

export function FloatingPanel({ children }: { children: ReactNode }) {
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
    if (isMaximized) {
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
    setIsMaximized(true);
    setIsMinimized(false);
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
    }
  };

  if (isPoppedOut) {
    return null;
  }

  const shellStyle = { left: panelState.x, top: panelState.y };

  if (isMaximized) {
    return (
      <section className={`floating-panel${isMinimized ? " floating-panel--minimized" : ""}`} style={{ left: 24, top: 24, width: "calc(100vw - 48px)", height: "calc(100vh - 48px)" }}>
        <div
          className="floating-panel__header"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div>
            <p className="floating-panel__eyebrow">PYHOPPER</p>
            <h2 className="floating-panel__title">Canvas</h2>
          </div>
          <div className="floating-panel__actions" onPointerDown={(event) => event.stopPropagation()}>
            <button onClick={() => setIsMinimized((value) => !value)} type="button">
              {isMinimized ? "Expand" : "Min"}
            </button>
            <button onClick={handlePopOut} type="button">
              Pop
            </button>
            <button onClick={toggleMaximize} type="button">
              Restore
            </button>
          </div>
        </div>
        {!isMinimized ? <div className="floating-panel__body">{children}</div> : null}
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
        <div
          className="floating-panel__header"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div>
            <p className="floating-panel__eyebrow">PYHOPPER</p>
            <h2 className="floating-panel__title">Canvas</h2>
          </div>
          <div className="floating-panel__actions" onPointerDown={(event) => event.stopPropagation()}>
            <button onClick={() => setIsMinimized((value) => !value)} type="button">
              {isMinimized ? "Expand" : "Min"}
            </button>
            <button onClick={handlePopOut} type="button">
              Pop
            </button>
            <button onClick={toggleMaximize} type="button">
              Max
            </button>
          </div>
        </div>
        {!isMinimized ? <div className="floating-panel__body">{children}</div> : null}
      </section>
    </ResizableBox>
  );
}
