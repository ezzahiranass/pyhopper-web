"use client";

import { type ChangeEvent, type KeyboardEvent, type RefObject } from "react";

import { ChatComposer } from "@/components/organisms/ChatComposer";
import { ChatHeader } from "@/components/organisms/ChatHeader";
import { ChatHistoryPanel } from "@/components/organisms/ChatHistoryPanel";
import { ChatTranscript } from "@/components/organisms/ChatTranscript";
import { FloatingActionPanel } from "@/components/molecules/FloatingActionPanel";
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
    <FloatingActionPanel className="chat-window">
      <ChatHeader
        meta={assistantMeta}
        onClose={onClose}
        onNewChat={onNewChat}
        onShowHistory={() => onViewChange("history")}
      />

      {view === "history" ? (
        <>
          <button className="chat-back" onClick={() => onViewChange("chat")} type="button">
            Back to conversation
          </button>
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
        </>
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
    </FloatingActionPanel>
  );
}
