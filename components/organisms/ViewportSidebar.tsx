"use client";

import {
  Circle,
  CircleDashed,
  Crosshair,
  PenTool,
  RectangleHorizontal,
  RotateCcw,
  MousePointer2,
  Spline,
} from "lucide-react";

import { ViewportToolButton } from "@/components/molecules/ViewportToolButton";
import { ViewportToolGroup } from "@/components/molecules/ViewportToolGroup";
import { useViewportTool } from "@/components/providers/ViewportToolProvider";

export function ViewportSidebar() {
  const { activeTool, setActiveTool } = useViewportTool();

  return (
    <nav aria-label="Viewport tools" className="viewport-sidebar">
      {/* Selection */}
      <div className="viewport-sidebar__section">
        <ViewportToolButton
          active={activeTool === "select"}
          label="Cursor: Box Select"
          onClick={() => setActiveTool("select")}
        >
          <MousePointer2 />
        </ViewportToolButton>
      </div>

      <div className="viewport-sidebar__separator" role="separator" />

      {/* Geometry */}
      <div className="viewport-sidebar__section">
        <ViewportToolButton
          active={activeTool === "point"}
          label="Point: Draw Point"
          onClick={() => setActiveTool("point")}
        >
          <Crosshair />
        </ViewportToolButton>
        <ViewportToolGroup
          active={activeTool !== "select" && activeTool !== "point"}
          icon={<Spline />}
          label="Curve: Draw Polyline"
          onClick={() => setActiveTool("polyline")}
        >
          <ViewportToolButton active={activeTool === "polyline"} label="Draw Polyline" onClick={() => setActiveTool("polyline")}>
            <Spline />
          </ViewportToolButton>
          <ViewportToolButton active={activeTool === "curve"} label="Draw Interpolated Curve" onClick={() => setActiveTool("curve")}>
            <PenTool />
          </ViewportToolButton>
          <ViewportToolButton active={activeTool === "control-curve"} label="Draw Control Point Curve" onClick={() => setActiveTool("control-curve")}>
            <Spline />
          </ViewportToolButton>
          <ViewportToolButton active={activeTool === "circle"} label="Draw Circle" onClick={() => setActiveTool("circle")}>
            <Circle />
          </ViewportToolButton>
          <ViewportToolButton active={activeTool === "arc"} label="Draw Arc" onClick={() => setActiveTool("arc")}>
            <RotateCcw />
          </ViewportToolButton>
          <ViewportToolButton active={activeTool === "ellipse"} label="Draw Ellipse" onClick={() => setActiveTool("ellipse")}>
            <CircleDashed />
          </ViewportToolButton>
          <ViewportToolButton active={activeTool === "rectangle"} label="Draw Rectangle" onClick={() => setActiveTool("rectangle")}>
            <RectangleHorizontal />
          </ViewportToolButton>
        </ViewportToolGroup>
      </div>
    </nav>
  );
}
