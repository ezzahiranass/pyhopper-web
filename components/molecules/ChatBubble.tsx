"use client";

import type { ChatMessage } from "@/lib/chat/chatStorage";

type ChatActionRow = {
  description: string;
  kind: string;
  label: string;
};

function buildActionRows(message: ChatMessage): ChatActionRow[] {
  if (message.role !== "assistant" || !message.thinking) {
    return [];
  }

  const rows: ChatActionRow[] = [];

  for (const action of message.thinking.actions) {
    rows.push({ kind: "edit", label: action, description: "assistant step" });
  }

  for (const observation of message.thinking.observations.slice(0, 2)) {
    rows.push({ kind: "note", label: observation, description: "observation" });
  }

  if (rows.length === 0 && message.thinking.summary) {
    rows.push({ kind: "state", label: message.thinking.summary, description: message.thinking.stop_reason });
  }

  return rows.slice(0, 4);
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const actionRows = buildActionRows(message);

  return (
    <div className={`chat-entry chat-entry--${message.role}`}>
      <div className="chat-entry__label">{message.role === "user" ? "you" : "assistant"}</div>
      <div className={`chat-bubble chat-bubble--${message.role}`}>{message.text}</div>
      {actionRows.length > 0 ? (
        <div className="chat-actions">
          {actionRows.map((action, index) => (
            <div className="chat-actions__item" key={`${message.id}-${index}`}>
              <span className="chat-actions__kind">{action.kind}</span>
              <span className="chat-actions__label">{action.label}</span>
              <span className="chat-actions__description">{action.description}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}