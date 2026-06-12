"use client";

import { IconButton } from "@/components/atoms/IconButton";

export function ChatTriggerButton({ onToggle }: { onToggle: () => void }) {
  return (
    <IconButton className="chat-trigger" label="Open assistant" onClick={onToggle}>
      <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
        <path d="M3 4L17 4L17 13L11 13L7 17L7 13L3 13Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <circle cx="7" cy="8.5" fill="currentColor" r="0.6" />
        <circle cx="10" cy="8.5" fill="currentColor" r="0.6" />
        <circle cx="13" cy="8.5" fill="currentColor" r="0.6" />
      </svg>
    </IconButton>
  );
}