"use client";

import { type RefObject } from "react";
import { Search } from "lucide-react";

import { SearchInput } from "@/components/atoms/SearchInput";
import { ChatHistoryItem } from "@/components/molecules/ChatHistoryItem";
import type { ChatSession } from "@/lib/chat/chatStorage";

type ChatHistoryPanelProps = {
  activeId: string | null;
  editTitle: string;
  editingId: string | null;
  hasSessions: boolean;
  confirmDeleteId: string | null;
  search: string;
  searchRef: RefObject<HTMLInputElement | null>;
  sessions: ChatSession[];
  onDelete: (id: string) => void;
  onDeleteConfirmChange: (id: string | null) => void;
  onEditTitleChange: (value: string) => void;
  onRenameCancel: () => void;
  onRenameStart: (session: ChatSession) => void;
  onRenameSubmit: (id: string) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

export function ChatHistoryPanel({
  activeId,
  editTitle,
  editingId,
  hasSessions,
  confirmDeleteId,
  search,
  searchRef,
  sessions,
  onDelete,
  onDeleteConfirmChange,
  onEditTitleChange,
  onRenameCancel,
  onRenameStart,
  onRenameSubmit,
  onSearchChange,
  onSelect,
  onNewChat,
}: ChatHistoryPanelProps) {
  return (
    <div className="chat-history">
      <div className="chat-history__toolbar">
        <div className="chat-history__search">
          <Search className="chat-history__search-icon" size={15} />
          <SearchInput
            ref={searchRef}
            className="chat-history__search-input"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search sessions..."
            type="text"
            value={search}
          />
        </div>
        <button className="chat-history__new" onClick={onNewChat} type="button">
          New
        </button>
      </div>

      <div className="chat-history__list">
        {!hasSessions ? <div className="chat-empty">No chats yet.</div> : null}
        {hasSessions && sessions.length === 0 ? <div className="chat-empty">No results found.</div> : null}
        {sessions.map((session) => (
          <ChatHistoryItem
            active={session.id === activeId}
            confirmDelete={confirmDeleteId === session.id}
            editTitle={editTitle}
            editing={editingId === session.id}
            key={session.id}
            onDelete={onDelete}
            onDeleteConfirmChange={onDeleteConfirmChange}
            onEditTitleChange={onEditTitleChange}
            onRenameCancel={onRenameCancel}
            onRenameStart={onRenameStart}
            onRenameSubmit={onRenameSubmit}
            onSelect={onSelect}
            session={session}
          />
        ))}
      </div>
    </div>
  );
}