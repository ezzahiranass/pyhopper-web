"use client";

import { type RefObject } from "react";

import { ChatBubble } from "@/components/molecules/ChatBubble";
import { ChatTypingIndicator } from "@/components/molecules/ChatTypingIndicator";
import type { ChatMessage } from "@/lib/chat/chatStorage";

export function ChatTranscript({
  messages,
  messagesEndRef,
  typing,
}: {
  messages: ChatMessage[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  typing: boolean;
}) {
  return (
    <div className="chat-messages">
      {messages.length === 0 && !typing ? (
        <div className="chat-empty">Ask, edit the graph, or describe a shape...</div>
      ) : null}
      {messages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}
      {typing ? <ChatTypingIndicator /> : null}
      <div ref={messagesEndRef} />
    </div>
  );
}