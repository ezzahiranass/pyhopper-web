from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ChatReplyResult:
    reply: str
    canvas_update: dict[str, Any] | None = None
    thinking: str | None = None
    max_turns_exceeded: bool = False


def _latest_user_text(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        if not isinstance(message, dict):
            continue
        if message.get("role") != "user":
            continue
        text = message.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()
    return ""


def _project_context_summary(project_context: dict[str, Any] | None) -> str:
    if not isinstance(project_context, dict):
        return ""

    active_project_id = project_context.get("activeProjectId")
    projects = project_context.get("projects")
    project_count = len(projects) if isinstance(projects, list) else None

    details: list[str] = []
    if isinstance(active_project_id, str) and active_project_id:
        details.append(f"active project: {active_project_id}")
    if project_count is not None:
        details.append(f"projects loaded: {project_count}")
    if not details:
        return ""
    return "Context: " + ", ".join(details) + "."


def generate_chat_reply(
    messages: list[dict[str, Any]],
    *,
    project_context: dict[str, Any] | None = None,
) -> ChatReplyResult:
    prompt = _latest_user_text(messages)
    if not prompt:
        return ChatReplyResult(reply="I did not receive a user prompt.")

    context_summary = _project_context_summary(project_context)
    reply_parts = [
        "The AI chat backend is running with a local fallback responder.",
        f"Latest prompt: {prompt}",
    ]
    if context_summary:
        reply_parts.append(context_summary)
    reply_parts.append(
        "Wire a full agent implementation into ai/service.py when you are ready to replace the fallback."
    )

    return ChatReplyResult(
        reply="\n\n".join(reply_parts),
        thinking="fallback_responder",
    )