"use client";

import { Pencil, Trash2 } from "lucide-react";

import { IconButton } from "@/components/atoms/IconButton";
import type { ChatSession } from "@/lib/chat/chatStorage";

type ChatHistoryItemProps = {
  active: boolean;
  confirmDelete: boolean;
  editing: boolean;
  editTitle: string;
  session: ChatSession;
  onDelete: (id: string) => void;
  onDeleteConfirmChange: (id: string | null) => void;
  onEditTitleChange: (value: string) => void;
  onRenameCancel: () => void;
  onRenameStart: (session: ChatSession) => void;
  onRenameSubmit: (id: string) => void;
  onSelect: (id: string) => void;
};

function formatRelativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp;

  if (elapsed < 60_000) {
    return "just now";
  }

  if (elapsed < 3_600_000) {
    return `${Math.floor(elapsed / 60_000)}m ago`;
  }

  if (elapsed < 86_400_000) {
    return `${Math.floor(elapsed / 3_600_000)}h ago`;
  }

  if (elapsed < 604_800_000) {
    return `${Math.floor(elapsed / 86_400_000)}d ago`;
  }

  return `${Math.floor(elapsed / 604_800_000)}w ago`;
}

function sessionPreview(session: ChatSession): string {
  const previewMessage = session.messages.find((message) => message.role === "user") ?? session.messages.at(-1);
  return previewMessage?.text ?? "Empty conversation";
}

export function ChatHistoryItem({
  active,
  confirmDelete,
  editing,
  editTitle,
  session,
  onDelete,
  onDeleteConfirmChange,
  onEditTitleChange,
  onRenameCancel,
  onRenameStart,
  onRenameSubmit,
  onSelect,
}: ChatHistoryItemProps) {
  const preview = sessionPreview(session);

  return (
    <div className={`chat-history__item${active ? " chat-history__item--active" : ""}`}>
      {editing ? (
        <input
          autoFocus
          className="chat-history__rename-input"
          onBlur={() => onRenameSubmit(session.id)}
          onChange={(event) => onEditTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onRenameSubmit(session.id);
            }

            if (event.key === "Escape") {
              onRenameCancel();
            }
          }}
          value={editTitle}
        />
      ) : (
        <button className="chat-history__item-btn" onClick={() => onSelect(session.id)} type="button">
          <span className="chat-history__item-header">
            <span className="chat-history__item-title">{session.title}</span>
            <span className="chat-history__item-time">{formatRelativeTime(session.updatedAt)}</span>
          </span>
          <span className="chat-history__item-meta">{preview}</span>
        </button>
      )}

      <div className="chat-history__item-actions">
        {confirmDelete ? (
          <div className="chat-history__confirm">
            <span className="chat-history__confirm-copy">Delete?</span>
            <button className="chat-history__confirm-btn chat-history__confirm-btn--danger" onClick={() => onDelete(session.id)} type="button">
              Yes
            </button>
            <button className="chat-history__confirm-btn" onClick={() => onDeleteConfirmChange(null)} type="button">
              No
            </button>
          </div>
        ) : (
          <>
            <IconButton className="chat-header__btn" label="Rename chat" onClick={() => onRenameStart(session)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton
              className="chat-header__btn chat-header__btn--danger"
              label="Delete chat"
              onClick={() => onDeleteConfirmChange(session.id)}
            >
              <Trash2 size={16} />
            </IconButton>
          </>
        )}
      </div>
    </div>
  );
}