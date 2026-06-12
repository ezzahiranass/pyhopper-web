from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import anyio
from mcp import types
from mcp.server import Server
from mcp.server.stdio import stdio_server


API_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[4]

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from definition_importer import (
    TEST_DEFINITION_SOURCE,
    build_definition_import_payload,
    get_definition_contract_markdown,
)


PROJECT_CONTEXT_PATH_ENV = "PYHOPPER_PROJECT_CONTEXT_PATH"
GENERATED_DIR = API_ROOT / "generated"

server = Server(
    "pyhopper-definition-tools",
    instructions=(
        "Tools for authoring safe declarative pyhopper definitions and applying them to the current canvas. "
        "Use the authoring guide before writing definitions if you are unsure about the supported subset."
    ),
)


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, Path):
        return str(value)

    if isinstance(value, dict):
        return {str(key): _json_safe(val) for key, val in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]

    return repr(value)


def _load_project_context() -> dict[str, Any]:
    context_path = os.getenv(PROJECT_CONTEXT_PATH_ENV)
    if not context_path:
        return {"activeProjectId": None}

    try:
        payload = json.loads(Path(context_path).read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[mcp/definition_authoring] failed to load project context: {exc!r}", file=sys.stderr)
        return {"activeProjectId": None}

    if not isinstance(payload, dict):
        return {"activeProjectId": None}

    active_project_id = payload.get("activeProjectId")
    return {
        "activeProjectId": active_project_id if isinstance(active_project_id, str) and active_project_id else None,
    }


def _supported_rules() -> list[str]:
    return [
        "Use one component call per assignment, like circle = Circle(radius, plane).",
        "Use only single-name assignments. Do not use tuple unpacking, loops, conditionals, or helper functions.",
        "Use exact pyhopper component names from the component catalog tools instead of guessing.",
        "Use numeric literals directly or assign numeric literals to variables first.",
        "Reference only previously assigned component results or numeric variables in component inputs.",
        "Input tree ops are supported inline: .graft(), .simplify(), .flatten(), .reverse(), .reparametrize().",
        "Output tree ops are supported on a separate line, like scene.simplify().",
        "Do not index into outputs or lists, and do not access atom internals like .normal or .points.",
        "For now, later nodes can only consume the primary output of a prior component assignment.",
    ]


def _write_frontend_payload(payload: dict[str, Any]) -> str:
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as handle:
        json.dump(_json_safe(payload), handle)
        return handle.name


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    print("[mcp/definition_authoring] list_tools called", file=sys.stderr)
    return [
        types.Tool(
            name="get_definition_authoring_guide",
            description=(
                "Get the declarative pyhopper definition contract and the currently supported safe authoring subset."
            ),
            inputSchema={
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
            outputSchema={
                "type": "object",
                "properties": {
                    "activeProjectId": {"type": ["string", "null"]},
                    "contract_markdown": {"type": "string"},
                    "supported_rules": {"type": "array", "items": {"type": "string"}},
                    "example_source": {"type": "string"},
                },
                "required": ["activeProjectId", "contract_markdown", "supported_rules", "example_source"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="apply_definition_to_canvas",
            description=(
                "Validate a declarative pyhopper definition, compile it, export the preview GLB, and prepare a canvas update "
                "for the active or specified project."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "definition_source": {
                        "type": "string",
                        "description": "The full declarative pyhopper definition source to apply.",
                    },
                    "project_id": {
                        "type": "string",
                        "description": "Optional project id. Defaults to the current active project.",
                    },
                },
                "required": ["definition_source"],
                "additionalProperties": False,
            },
            outputSchema={
                "type": "object",
                "properties": {
                    "ok": {"type": "boolean"},
                    "project_id": {"type": ["string", "null"]},
                    "payload_path": {"type": ["string", "null"]},
                    "summary": {
                        "type": ["object", "null"],
                        "properties": {
                            "node_count": {"type": "integer"},
                            "edge_count": {"type": "integer"},
                            "object_count": {"type": "integer"},
                        },
                        "required": ["node_count", "edge_count", "object_count"],
                        "additionalProperties": False,
                    },
                    "error": {"type": ["string", "null"]},
                },
                "required": ["ok", "project_id", "payload_path", "summary", "error"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="validate_definition_dry_run",
            description=(
                "Validate a declarative pyhopper definition without committing it to the active canvas."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "definition_source": {
                        "type": "string",
                        "description": "The full declarative pyhopper definition source to validate.",
                    },
                    "project_id": {
                        "type": "string",
                        "description": "Optional project id. Defaults to the current active project.",
                    },
                },
                "required": ["definition_source"],
                "additionalProperties": False,
            },
            outputSchema={
                "type": "object",
                "properties": {
                    "ok": {"type": "boolean"},
                    "project_id": {"type": ["string", "null"]},
                    "python_source": {"type": ["string", "null"]},
                    "validation_report": {"type": ["object", "null"]},
                    "error": {"type": ["string", "null"]},
                },
                "required": ["ok", "project_id", "python_source", "validation_report", "error"],
                "additionalProperties": False,
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    print(f"[mcp/definition_authoring] call_tool name={name} arguments={arguments}", file=sys.stderr)
    arguments = arguments or {}
    project_context = _load_project_context()

    if name == "get_definition_authoring_guide":
        return {
            "activeProjectId": project_context["activeProjectId"],
            "contract_markdown": get_definition_contract_markdown(),
            "supported_rules": _supported_rules(),
            "example_source": TEST_DEFINITION_SOURCE,
        }

    if name == "apply_definition_to_canvas":
        definition_source = arguments.get("definition_source")
        if not isinstance(definition_source, str) or not definition_source.strip():
            return {
                "ok": False,
                "project_id": None,
                "payload_path": None,
                "summary": None,
                "error": "definition_source must be a non-empty string",
            }

        requested_project_id = arguments.get("project_id")
        project_id = (
            requested_project_id.strip()
            if isinstance(requested_project_id, str) and requested_project_id.strip()
            else project_context["activeProjectId"]
        )

        if not project_id:
            return {
                "ok": False,
                "project_id": None,
                "payload_path": None,
                "summary": None,
                "error": "No active project is available and no project_id was provided.",
            }

        try:
            payload = build_definition_import_payload(project_id, definition_source.strip(), GENERATED_DIR)
            payload_path = _write_frontend_payload(payload)
            summary = {
                "node_count": len(payload["flow"]["nodes"]),
                "edge_count": len(payload["flow"]["edges"]),
                "object_count": len(payload["render_manifest"]["objects"]),
            }
            print(
                f"[mcp/definition_authoring] applied definition project_id={project_id!r} "
                f"nodes={summary['node_count']} edges={summary['edge_count']} objects={summary['object_count']}",
                file=sys.stderr,
            )
            return {
                "ok": True,
                "project_id": project_id,
                "payload_path": payload_path,
                "summary": summary,
                "error": None,
            }
        except Exception as exc:
            print(f"[mcp/definition_authoring] apply failed: {exc!r}", file=sys.stderr)
            return {
                "ok": False,
                "project_id": project_id,
                "payload_path": None,
                "summary": None,
                "error": str(exc),
            }

    if name == "validate_definition_dry_run":
        definition_source = arguments.get("definition_source")
        if not isinstance(definition_source, str) or not definition_source.strip():
            return {
                "ok": False,
                "project_id": None,
                "python_source": None,
                "validation_report": None,
                "error": "definition_source must be a non-empty string",
            }

        requested_project_id = arguments.get("project_id")
        project_id = (
            requested_project_id.strip()
            if isinstance(requested_project_id, str) and requested_project_id.strip()
            else project_context["activeProjectId"]
        ) or "pyhopper-preview"

        try:
            payload = build_definition_import_payload(project_id, definition_source.strip(), GENERATED_DIR)
            report = {
                "status": "passed",
                "checks_passed": ["parse", "compile", "export", "preview"],
                "issues": [],
                "node_count": len(payload["flow"]["nodes"]),
                "edge_count": len(payload["flow"]["edges"]),
                "object_count": len(payload["render_manifest"]["objects"]),
            }
            return {
                "ok": True,
                "project_id": project_id,
                "python_source": payload["python_source"],
                "validation_report": report,
                "error": None,
            }
        except Exception as exc:
            return {
                "ok": False,
                "project_id": project_id,
                "python_source": None,
                "validation_report": {
                    "status": "failed",
                    "checks_passed": [],
                    "issues": [{"code": "parse_failed", "stage": "validate", "message": str(exc), "repair_hint": None}],
                },
                "error": str(exc),
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
