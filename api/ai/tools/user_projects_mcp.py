from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import anyio
from mcp import types
from mcp.server import Server
from mcp.server.stdio import stdio_server


PROJECT_CONTEXT_PATH_ENV = "PYHOPPER_PROJECT_CONTEXT_PATH"

server = Server(
    "pyhopper-user-project-tools",
    instructions=(
        "Tools for inspecting the current user's pyhopper project index and stored graph snapshots."
    ),
)


def _load_project_context() -> dict[str, Any]:
    context_path = os.getenv(PROJECT_CONTEXT_PATH_ENV)
    if not context_path:
        return {
            "activeProjectId": None,
            "projects": [],
            "snapshots": {},
            "exports": {},
        }

    try:
        payload = json.loads(Path(context_path).read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[mcp/user_projects] failed to load project context: {exc!r}", file=sys.stderr)
        return {
            "activeProjectId": None,
            "projects": [],
            "snapshots": {},
            "exports": {},
        }

    if not isinstance(payload, dict):
        return {
            "activeProjectId": None,
            "projects": [],
            "snapshots": {},
            "exports": {},
        }

    return {
        "activeProjectId": payload.get("activeProjectId"),
        "projects": payload.get("projects") if isinstance(payload.get("projects"), list) else [],
        "snapshots": payload.get("snapshots") if isinstance(payload.get("snapshots"), dict) else {},
        "exports": payload.get("exports") if isinstance(payload.get("exports"), dict) else {},
    }


def _find_project(projects: list[dict[str, Any]], project_id: str) -> dict[str, Any] | None:
    for project in projects:
        if isinstance(project, dict) and project.get("id") == project_id:
            return project
    return None


def _project_matches(project: dict[str, Any], query: str) -> bool:
    q = query.lower()
    return any(
        q in str(project.get(field, "")).lower()
        for field in ("id", "name")
    )


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    print("[mcp/user_projects] list_tools called", file=sys.stderr)
    return [
        types.Tool(
            name="list_user_projects",
            description=(
                "List the user's pyhopper projects/definitions from local storage, including active project state."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional free-text filter against project id or name.",
                    },
                },
                "additionalProperties": False,
            },
            outputSchema={
                "type": "object",
                "properties": {
                    "activeProjectId": {"type": ["string", "null"]},
                    "count": {"type": "integer"},
                    "projects": {"type": "array"},
                },
                "required": ["activeProjectId", "count", "projects"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="get_project_snapshot",
            description=(
                "Get the stored graph snapshot and export metadata for a specific pyhopper project."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The project id to inspect.",
                    },
                },
                "required": ["project_id"],
                "additionalProperties": False,
            },
            outputSchema={
                "type": "object",
                "properties": {
                    "project": {"type": ["object", "null"]},
                    "snapshot": {"type": ["object", "null"]},
                    "export": {"type": ["object", "null"]},
                },
                "required": ["project", "snapshot", "export"],
                "additionalProperties": False,
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    print(f"[mcp/user_projects] call_tool name={name} arguments={arguments}", file=sys.stderr)
    arguments = arguments or {}
    context = _load_project_context()
    projects = context["projects"]
    snapshots = context["snapshots"]
    exports = context["exports"]

    if name == "list_user_projects":
        query = arguments.get("query")
        filtered = projects
        if isinstance(query, str) and query.strip():
            filtered = [project for project in projects if isinstance(project, dict) and _project_matches(project, query.strip())]

        print(
            f"[mcp/user_projects] returning {len(filtered)} project(s) active={context['activeProjectId']!r}",
            file=sys.stderr,
        )
        return {
            "activeProjectId": context["activeProjectId"],
            "count": len(filtered),
            "projects": filtered,
        }

    if name == "get_project_snapshot":
        project_id = arguments.get("project_id")
        if not isinstance(project_id, str) or not project_id.strip():
            raise ValueError("project_id must be a non-empty string")

        project_id = project_id.strip()
        project = _find_project(projects, project_id)
        snapshot = snapshots.get(project_id)
        export_payload = exports.get(project_id)
        print(
            f"[mcp/user_projects] snapshot lookup project_id={project_id!r} "
            f"found_project={project is not None} found_snapshot={snapshot is not None}",
            file=sys.stderr,
        )
        return {
            "project": project,
            "snapshot": snapshot,
            "export": export_payload,
        }

    raise ValueError(f"Unknown tool: {name}")


async def _main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    anyio.run(_main)
