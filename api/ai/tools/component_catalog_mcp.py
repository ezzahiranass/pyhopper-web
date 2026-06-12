from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import anyio
from mcp import types
from mcp.server import Server
from mcp.server.stdio import stdio_server


REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pyhopper.admin_utils import list_components


server = Server(
    "pyhopper-component-tools",
    instructions=(
        "Tools for inspecting the pyhopper component catalog. "
        "Use list_components to discover components, categories, descriptions, and IO signatures."
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

    to_json = getattr(value, "to_json", None)
    if callable(to_json):
        try:
            return _json_safe(to_json())
        except Exception:
            pass

    return repr(value)


def _matches_query(component: dict[str, Any], query: str) -> bool:
    haystacks: list[str] = [
        str(component.get("component", "")),
        str(component.get("component_key", "")),
        str(component.get("tab", "")),
        str(component.get("category", "")),
        str(component.get("description", "")),
    ]

    for section in component.get("inputs", []):
        if isinstance(section, dict):
            haystacks.extend(str(value) for value in section.values() if value is not None)

    for section in component.get("outputs", []):
        if isinstance(section, dict):
            haystacks.extend(str(value) for value in section.values() if value is not None)

    query_lower = query.lower()
    return any(query_lower in value.lower() for value in haystacks)


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    print("[mcp/component_catalog] list_tools called", file=sys.stderr)
    return [
        types.Tool(
            name="list_components",
            description=(
                "List pyhopper components with category, description, inputs, outputs, and metadata. "
                "Supports filtering by tab, category, and free-text query."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "tab": {
                        "type": "string",
                        "description": "Optional top-level tab filter such as Curve, Surface, Vector, or Transform.",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter such as Analysis, Primitive, or Euclidian.",
                    },
                    "query": {
                        "type": "string",
                        "description": "Optional free-text query matched against names, descriptions, inputs, and outputs.",
                    },
                },
                "additionalProperties": False,
            },
            outputSchema={
                "type": "object",
                "properties": {
                    "count": {"type": "integer"},
                    "components": {"type": "array"},
                },
                "required": ["count", "components"],
                "additionalProperties": False,
            },
        )
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    print(f"[mcp/component_catalog] call_tool name={name} arguments={arguments}", file=sys.stderr)
    if name != "list_components":
        raise ValueError(f"Unknown tool: {name}")

    arguments = arguments or {}
    tab = arguments.get("tab")
    category = arguments.get("category")
    query = arguments.get("query")

    components = [_json_safe(component) for component in list_components()]

    if isinstance(tab, str) and tab.strip():
        tab_lower = tab.strip().lower()
        components = [component for component in components if str(component.get("tab", "")).lower() == tab_lower]

    if isinstance(category, str) and category.strip():
        category_lower = category.strip().lower()
        components = [
            component
            for component in components
            if str(component.get("category", "")).lower() == category_lower
        ]

    if isinstance(query, str) and query.strip():
        components = [component for component in components if _matches_query(component, query.strip())]

    print(
        f"[mcp/component_catalog] returning {len(components)} component(s) "
        f"for tab={tab!r} category={category!r} query={query!r}",
        file=sys.stderr,
    )
    return {
        "count": len(components),
        "components": components,
    }


async def _main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    anyio.run(_main)
