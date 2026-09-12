"use client";

import { type CSSProperties, type MouseEvent } from "react";
import { Position } from "@xyflow/react";

import { GraphHandle } from "@/components/atoms/GraphHandle";
import { PortOperationBadge } from "@/components/molecules/PortOperationBadge";

type GraphPortRowProps = {
  /** Grasshopper access of the port (item / list / tree); drawn as a subtle handle hint. */
  access?: string;
  badge?: string;
  handleClassName: string;
  handleId: string;
  handleStyle?: CSSProperties;
  kind: "input" | "output";
  label?: string;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  title?: string;
};

export function GraphPortRow({
  access,
  badge,
  handleClassName,
  handleId,
  handleStyle,
  kind,
  label,
  onContextMenu,
  title,
}: GraphPortRowProps) {
  const isInput = kind === "input";

  return (
    <div
      className={`component-node__port-row component-node__port-row--${kind}`}
      data-access={access ?? undefined}
      onContextMenu={onContextMenu}
      title={title}
    >
      {isInput ? (
        <>
          <GraphHandle
            className={handleClassName}
            id={handleId}
            position={Position.Left}
            style={handleStyle}
            type="target"
          />
          {label ? (
            <p className="component-node__port-name">
              <span className="component-node__port-label">{label}</span>
              {badge ? <PortOperationBadge value={badge} /> : null}
            </p>
          ) : null}
        </>
      ) : (
        <>
          {label ? (
            <p className="component-node__port-name">
              {badge ? <PortOperationBadge value={badge} /> : null}
              <span className="component-node__port-label">{label}</span>
            </p>
          ) : null}
          <GraphHandle
            className={handleClassName}
            id={handleId}
            position={Position.Right}
            style={handleStyle}
            type="source"
          />
        </>
      )}
    </div>
  );
}