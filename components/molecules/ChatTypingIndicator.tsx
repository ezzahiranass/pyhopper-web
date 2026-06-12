"use client";

export function ChatTypingIndicator() {
  return (
    <div className="chat-entry chat-entry--assistant">
      <div className="chat-entry__label">assistant</div>
      <div className="chat-typing">
        <span className="chat-typing__dot" />
        <span className="chat-typing__dot" />
        <span className="chat-typing__dot" />
      </div>
    </div>
  );
}