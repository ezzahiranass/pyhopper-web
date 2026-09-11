"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";

import { IconButton } from "@/components/atoms/IconButton";

type NodeFormProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
};

type NodeFormRowProps = {
  children: ReactNode;
  label: string;
};

export function NodeForm({ children, onClose, title }: NodeFormProps) {
  return (
    <div className="node-form nodrag nowheel" onDoubleClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <header className="node-form__header">
        <span className="node-form__title">{title}</span>
        <IconButton className="node-form__close" label="Close node form" onClick={onClose}>
          <X size={13} />
        </IconButton>
      </header>
      <div className="node-form__body">{children}</div>
    </div>
  );
}

export function NodeFormRow({ children, label }: NodeFormRowProps) {
  return (
    <label className="node-form__row">
      <span className="node-form__label">{label}</span>
      <span className="node-form__control">{children}</span>
    </label>
  );
}
