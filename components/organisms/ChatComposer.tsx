"use client";

import { type ChangeEvent, type KeyboardEvent, type RefObject } from "react";

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
          placeholder="Ask, edit the graph, or describe a shape..."
          rows={2}
          value={draft}
        />
        <div className="chat-composer__footer">
          <span className="chat-composer__hint">+ graph · + selection</span>
          <button
            className="chat-send"
            disabled={!draft.trim() || typing}
            onClick={onSend}
            title="Send"
            type="button"
          >
            Send ⏎
          </button>
        </div>
      </div>
    </div>
  );
}