"use client";

import type { InputHTMLAttributes } from "react";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function NumberInput({ className = "", ...props }: NumberInputProps) {
  return <input className={`number-input ${className}`.trim()} type="number" {...props} />;
}
