const SESSIONS_KEY = "pyhopper-chat-sessions";
const ACTIVE_KEY = "pyhopper-chat-active";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  thinking?: ChatThinking | null;
};

export type ChatThinking = {
  goal: string;
  summary: string;
  plan: string[];
  actions: string[];
  observations: string[];
  retries: string[];
  conclusion: string;
  stop_reason: string;
  max_turns_exceeded?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

let counter = 0;

export function makeId(): string {
  return `${Date.now()}-${++counter}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeThinking(value: unknown): ChatThinking | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const goal = typeof record.goal === "string" ? record.goal : "Handle the current request.";
  const summary = typeof record.summary === "string" ? record.summary : "";
  const conclusion = typeof record.conclusion === "string" ? record.conclusion : summary;
  const stopReason = typeof record.stop_reason === "string" ? record.stop_reason : "completed";
  const toList = (input: unknown) =>
    Array.isArray(input) ? input.filter((entry): entry is string => typeof entry === "string") : [];

  return {
    goal,
    summary,
    plan: toList(record.plan),
    actions: toList(record.actions),
    observations: toList(record.observations),
    retries: toList(record.retries),
    conclusion,
    stop_reason: stopReason,
    max_turns_exceeded:
      typeof record.max_turns_exceeded === "boolean" ? record.max_turns_exceeded : false,
  };
}

function normalizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if ((record.role !== "user" && record.role !== "assistant") || typeof record.text !== "string") {
    return null;
  }

  return {
    id: typeof record.id === "string" ? record.id : makeId(),
    role: record.role,
    text: record.text,
    timestamp: typeof record.timestamp === "number" ? record.timestamp : Date.now(),
    thinking: normalizeThinking(record.thinking),
  };
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded
  }
}

export function loadSessions(): ChatSession[] {
  const raw = read<unknown[]>(SESSIONS_KEY, []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((session) => {
      if (!session || typeof session !== "object" || Array.isArray(session)) {
        return null;
      }
      const record = session as Record<string, unknown>;
      if (typeof record.id !== "string" || typeof record.title !== "string") {
        return null;
      }

      const messages = Array.isArray(record.messages)
        ? record.messages
            .map((message) => normalizeMessage(message))
            .filter((message): message is ChatMessage => message !== null)
        : [];

      return {
        id: record.id,
        title: record.title,
        messages,
        createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
        updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
      } satisfies ChatSession;
    })
    .filter((session): session is ChatSession => session !== null);
}

export function saveSessions(sessions: ChatSession[]): void {
  write(SESSIONS_KEY, sessions);
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function createSession(): ChatSession {
  return {
    id: makeId(),
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function deleteSession(sessions: ChatSession[], id: string): ChatSession[] {
  return sessions.filter((session) => session.id !== id);
}

export function renameSession(sessions: ChatSession[], id: string, title: string): ChatSession[] {
  return sessions.map((session) => (session.id === id ? { ...session, title } : session));
}

export function pushMessage(sessions: ChatSession[], sessionId: string, message: ChatMessage): ChatSession[] {
  return sessions.map((session) =>
    session.id === sessionId
      ? { ...session, messages: [...session.messages, message], updatedAt: Date.now() }
      : session,
  );
}

export function autoTitle(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed;
}

export function searchSessions(sessions: ChatSession[], query: string): ChatSession[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return sessions;
  }

  return sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(normalizedQuery) ||
      session.messages.some((message) => message.text.toLowerCase().includes(normalizedQuery)),
  );
}