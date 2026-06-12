"use client";

import { X } from "lucide-react";

import { IconButton } from "@/components/atoms/IconButton";

export function ChatHeader({ meta, onClose }: { meta: string; onClose: () => void }) {
  return (
    <div className="chat-header">
      <div aria-hidden="true" className="chat-header__badge">
        ◇
      </div>
      <div className="chat-header__copy">
        <p className="chat-header__title">Assistant</p>
        <p className="chat-header__meta">{meta}</p>
      </div>
      <div className="chat-header__actions">
        <IconButton className="chat-header__btn" label="Close assistant" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
    </div>
  );
}