"use client";

import { type ChangeEvent, type KeyboardEvent, type RefObject } from "react";

import { ChatComposer } from "@/components/organisms/ChatComposer";
import { ChatHeader } from "@/components/organisms/ChatHeader";
import { ChatHistoryPanel } from "@/components/organisms/ChatHistoryPanel";
import { ChatTranscript } from "@/components/organisms/ChatTranscript";
import type { ChatMessage, ChatSession } from "@/lib/chat/chatStorage";

type ChatWindowProps = {
  activeId: string | null;
  assistantMeta: string;
  draft: string;
  editTitle: string;
  editingId: string | null;
  confirmDeleteId: string | null;
  filteredSessions: ChatSession[];
  hasSessions: boolean;
  messages: ChatMessage[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  search: string;
  searchRef: RefObject<HTMLInputElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  typing: boolean;
  view: "chat" | "history";
  onClose: () => void;
  onDelete: (id: string) => void;
  onDeleteConfirmChange: (id: string | null) => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onEditTitleChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onNewChat: () => void;
  onRenameCancel: () => void;
  onRenameStart: (session: ChatSession) => void;
  onRenameSubmit: (id: string) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onSend: () => void;
  onViewChange: (view: "chat" | "history") => void;
};

export function ChatWindow({
  activeId,
  assistantMeta,
  draft,
  editTitle,
  editingId,
  confirmDeleteId,
  filteredSessions,
  hasSessions,
  messages,
  messagesEndRef,
  search,
  searchRef,
  textareaRef,
  typing,
  view,
  onClose,
  onDelete,
  onDeleteConfirmChange,
  onDraftChange,
  onEditTitleChange,
  onKeyDown,
  onNewChat,
  onRenameCancel,
  onRenameStart,
  onRenameSubmit,
  onSearchChange,
  onSelect,
  onSend,
  onViewChange,
}: ChatWindowProps) {
  return (
    <div className="chat-window">
      <ChatHeader meta={assistantMeta} onClose={onClose} />

      <div aria-label="Assistant views" className="chat-tabs" role="tablist">
        {(["chat", "history"] as const).map((tab) => (
          <button
            aria-selected={view === tab}
            className={`chat-tab${view === tab ? " chat-tab--active" : ""}`}
            key={tab}
            onClick={() => onViewChange(tab)}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {view === "history" ? (
        <ChatHistoryPanel
          activeId={activeId}
          editTitle={editTitle}
          editingId={editingId}
          hasSessions={hasSessions}
          confirmDeleteId={confirmDeleteId}
          onDelete={onDelete}
          onDeleteConfirmChange={onDeleteConfirmChange}
          onEditTitleChange={onEditTitleChange}
          onRenameCancel={onRenameCancel}
          onRenameStart={onRenameStart}
          onRenameSubmit={onRenameSubmit}
          onSearchChange={onSearchChange}
          onSelect={onSelect}
          onNewChat={onNewChat}
          search={search}
          searchRef={searchRef}
          sessions={filteredSessions}
        />
      ) : (
        <>
          <ChatTranscript messages={messages} messagesEndRef={messagesEndRef} typing={typing} />
          <ChatComposer
            draft={draft}
            onChange={onDraftChange}
            onKeyDown={onKeyDown}
            onSend={onSend}
            textareaRef={textareaRef}
            typing={typing}
          />
        </>
      )}
    </div>
  );
}