"use client";

import { History, Plus, X } from "lucide-react";

import { IconButton } from "@/components/atoms/IconButton";
import { FloatingActionPanelHeader } from "@/components/molecules/FloatingActionPanelHeader";

type ChatHeaderProps = {
  meta: string;
  onClose: () => void;
  onNewChat: () => void;
  onShowHistory: () => void;
};

export function ChatHeader({
  meta,
  onClose,
  onNewChat,
  onShowHistory,
}: ChatHeaderProps) {
  return (
    <FloatingActionPanelHeader
      actions={
        <>
        <IconButton className="chat-header__btn" label="New chat" onClick={onNewChat}>
          <Plus />
        </IconButton>
        <IconButton className="chat-header__btn" label="Chat history" onClick={onShowHistory}>
          <History />
        </IconButton>
        <IconButton className="chat-header__btn" label="Close assistant" onClick={onClose}>
          <X />
        </IconButton>
        </>
      }
      meta={meta}
      title="Assistant"
    />
  );
}
