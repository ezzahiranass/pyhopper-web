"use client";

import { type ReactNode } from "react";

import { IconButton } from "@/components/atoms/IconButton";

type FloatingActionButtonProps = {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

export function FloatingActionButton({
  children,
  className,
  disabled,
  label,
  onClick,
}: FloatingActionButtonProps) {
  return (
    <IconButton className={className} disabled={disabled} label={label} onClick={onClick}>
      {children}
    </IconButton>
  );
}