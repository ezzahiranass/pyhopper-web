"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonProps = {
  children: ReactNode;
  label: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "title">;

export function IconButton({ children, label, type = "button", ...props }: IconButtonProps) {
  return (
    <button aria-label={label} title={label} type={type} {...props}>
      {children}
    </button>
  );
}