"use client";

type PortOperationBadgeProps = {
  value: string;
};

export function PortOperationBadge({ value }: PortOperationBadgeProps) {
  return <span className="component-node__port-op">{value}</span>;
}