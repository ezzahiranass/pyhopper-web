"use client";

import { type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { SendHorizontal } from "lucide-react";

import { IconButton } from "@/components/atoms/IconButton";

export function ChatComposer({
  draft,
  textareaRef,
  typing,
  onChange,
  onKeyDown,
  onSend,
}: {
  draft: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  typing: boolean;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}) {
  return (
    <div className="chat-composer">
      <div className="chat-composer__shell">
        <textarea
          ref={textareaRef}
          className="chat-input"
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Ask about or edit this graph..."
          rows={1}
          value={draft}
        />
        <IconButton
          className="chat-send"
          disabled={!draft.trim() || typing}
          label="Send message"
          onClick={onSend}
        >
          <SendHorizontal />
        </IconButton>
      </div>
    </div>
  );
}
