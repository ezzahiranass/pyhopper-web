"use client";

import { type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatTriggerButton } from "@/components/molecules/ChatTriggerButton";
import { ChatWindow } from "@/components/organisms/ChatWindow";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { useProjects } from "@/components/providers/ProjectsProvider";
import {
  autoTitle,
  createSession,
  deleteSession,
  getActiveSessionId,
  loadSessions,
  makeId,
  pushMessage,
  renameSession,
  saveSessions,
  searchSessions,
  setActiveSessionId,
  type ChatMessage,
  type ChatSession,
} from "@/lib/chat/chatStorage";
import type { DefinitionDocument } from "@/lib/firestore/definitions";
import type { GraphImportResponse } from "@/lib/graph/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type View = "chat" | "history";

function buildProjectContext(
  activeProjectId: string | null,
  projects: Array<{ id: string; name: string; createdAt: number; updatedAt: number }>,
  projectDocuments: Record<string, DefinitionDocument>,
) {
  const snapshots: Record<string, unknown> = {};
  const exports: Record<string, unknown> = {};

  for (const project of projects) {
    const document = projectDocuments[project.id];
    if (document?.snapshot) {
      snapshots[project.id] = document.snapshot;
    }
    if (document?.graphExport) {
      exports[project.id] = document.graphExport;
    }
  }

  return {
    activeProjectId,
    projects,
    snapshots,
    exports,
  };
}

type ProjectChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectChat({ open, onOpenChange }: ProjectChatProps) {
  const { activeProjectId, projectDocuments, projects } = useProjects();
  const { importGraph, nodes, selectedNodeIds } = useGraphEditor();
  const [view, setView] = useState<View>("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? null,
    [activeId, sessions],
  );
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);

  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    const savedId = getActiveSessionId();
    if (savedId && loaded.some((session) => session.id === savedId)) {
      setActiveId(savedId);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveSessions(sessions);
  }, [hydrated, sessions]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setActiveSessionId(activeId);
  }, [activeId, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open && view === "chat") {
      textareaRef.current?.focus();
    }

    if (open && view === "history") {
      searchRef.current?.focus();
    }
  }, [open, view]);

  const startNewChat = useCallback(() => {
    const session = createSession();
    setSessions((previous) => [session, ...previous]);
    setActiveId(session.id);
    setView("chat");
    setDraft("");
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
    setView("chat");
    setDraft("");
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setSessions((previous) => deleteSession(previous, id));
      if (activeId === id) {
        setActiveId(null);
      }
      setEditingId(null);
      setConfirmDeleteId(null);
    },
    [activeId],
  );

  const handleRenameSubmit = useCallback(
    (id: string) => {
      const trimmed = editTitle.trim();
      if (trimmed) {
        setSessions((previous) => renameSession(previous, id, trimmed));
      }
      setEditingId(null);
    },
    [editTitle],
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || typing) {
      return;
    }

    let currentId = activeId;
    let history = messages;

    if (!currentId) {
      const session = createSession();
      session.title = autoTitle(text);
      setSessions((previous) => [session, ...previous]);
      currentId = session.id;
      setActiveId(session.id);
      history = [];
    }

    const userMessage: ChatMessage = { id: makeId(), role: "user", text, timestamp: Date.now() };

    setSessions((previous) => {
      let updated = pushMessage(previous, currentId!, userMessage);
      const session = updated.find((entry) => entry.id === currentId);
      if (session && session.messages.filter((message) => message.role === "user").length === 1) {
        updated = renameSession(updated, currentId!, autoTitle(text));
      }
      return updated;
    });

    setDraft("");
    setTyping(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const replyTarget = currentId;

    try {
      const response = await fetch(`${apiBaseUrl}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...history, userMessage].map((message) => ({
            role: message.role,
            text: message.text,
            timestamp: message.timestamp,
          })),
          projectContext: buildProjectContext(activeProjectId, projects, projectDocuments),
        }),
      });

      const payload = (await response.json()) as
        | {
            reply?: string;
            canvas_update?: GraphImportResponse | null;
            thinking?: ChatMessage["thinking"];
            max_turns_exceeded?: boolean;
          }
        | { error?: { message?: string } };

      if (!response.ok || !("reply" in payload) || typeof payload.reply !== "string") {
        const message =
          "error" in payload && payload.error?.message
            ? payload.error.message
            : "The AI backend did not return a reply.";
        throw new Error(message);
      }

      if (payload.canvas_update) {
        importGraph(payload.canvas_update);
      }

      const reply: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: payload.reply,
        thinking: "thinking" in payload ? payload.thinking ?? null : null,
        timestamp: Date.now(),
      };
      setSessions((previous) => pushMessage(previous, replyTarget!, reply));
    } catch (error) {
      const reply: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: error instanceof Error ? error.message : "The AI request failed.",
        timestamp: Date.now(),
      };
      setSessions((previous) => pushMessage(previous, replyTarget!, reply));
    } finally {
      setTyping(false);
    }
  }, [activeId, activeProjectId, draft, importGraph, messages, projectDocuments, projects, typing]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void send();
      }
    },
    [send],
  );

  const handleInput = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, []);

  const filteredSessions = useMemo(() => {
    const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    return searchSessions(sortedSessions, search);
  }, [search, sessions]);

  const assistantMeta = useMemo(() => {
    const projectName = projects.find((project) => project.id === activeProjectId)?.name ?? "graph";
    const selectedNames = nodes
      .filter((node) => selectedNodeIds.includes(node.id))
      .map((node) => node.data.definition.component)
      .filter(Boolean);

    const selectionLabel =
      selectedNames.length === 0
        ? "sel:none"
        : selectedNames.length === 1
          ? `sel:${selectedNames[0]}`
          : `sel:${selectedNames[0]}+${selectedNames.length - 1}`;

    return `ctx: ${projectName} · ${nodes.length} nodes · ${selectionLabel}`;
  }, [activeProjectId, nodes, projects, selectedNodeIds]);

  return (
    <>
      <ChatTriggerButton open={open} onToggle={() => onOpenChange(!open)} />
      {open ? (
        <ChatWindow
          activeId={activeId}
          assistantMeta={assistantMeta}
          draft={draft}
          editTitle={editTitle}
          editingId={editingId}
          filteredSessions={filteredSessions}
          hasSessions={sessions.length > 0}
          messages={messages}
          messagesEndRef={messagesEndRef}
          confirmDeleteId={confirmDeleteId}
          onClose={() => onOpenChange(false)}
          onDelete={handleDelete}
          onDeleteConfirmChange={setConfirmDeleteId}
          onDraftChange={handleInput}
          onEditTitleChange={setEditTitle}
          onKeyDown={handleKeyDown}
          onNewChat={startNewChat}
          onRenameCancel={() => setEditingId(null)}
          onRenameStart={(session) => {
            setEditingId(session.id);
            setEditTitle(session.title);
          }}
          onRenameSubmit={handleRenameSubmit}
          onSearchChange={setSearch}
          onSelect={selectSession}
          onSend={() => {
            void send();
          }}
          onViewChange={(nextView) => {
            setView(nextView);
            if (nextView === "chat") {
              setSearch("");
            }
          }}
          search={search}
          searchRef={searchRef}
          textareaRef={textareaRef}
          typing={typing}
          view={view}
        />
      ) : null}
    </>
  );
}
