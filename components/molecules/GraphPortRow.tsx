"use client";

import { type CSSProperties, type MouseEvent } from "react";
import { Position } from "@xyflow/react";

import { GraphHandle } from "@/components/atoms/GraphHandle";
import { PortOperationBadge } from "@/components/molecules/PortOperationBadge";

type GraphPortRowProps = {
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
              {label}
              {badge ? <PortOperationBadge value={badge} /> : null}
            </p>
          ) : null}
        </>
      ) : (
        <>
          {label ? (
            <p className="component-node__port-name">
              {badge ? <PortOperationBadge value={badge} /> : null}
              {label}
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