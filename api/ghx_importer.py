"""Translate a strict subset of Grasshopper GHX archives into pyhopper graphs."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from typing import Any

from definition_importer import CATALOG_BY_KEY
from graph_compiler import compile_graph_document, execute_compiled_graph


MAX_GHX_BYTES = 10 * 1024 * 1024

GH_COMPONENT_GUID_MAPPINGS = {
    "3581f42a-9592-4549-bd6b-1c0fc39d067b": (
        "pyhopper.Components.Vector.Point.ConstructPoint.ConstructPoint"
    ),
    "57da07bd-ecab-415d-9d86-af36d7073abc": (
        "pyhopper.Components.Params.Input.NumberSlider.NumberSlider"
    ),
}


class GhxImportError(ValueError):
    """Raised when a GHX archive cannot be translated without data loss."""


def _normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


CATALOG_BY_NORMALIZED_NAME: dict[str, list[dict[str, Any]]] = defaultdict(list)
for _definition in CATALOG_BY_KEY.values():
    CATALOG_BY_NORMALIZED_NAME[_normalized_name(_definition["component"])].append(_definition)


def _item_text(parent: ET.Element | None, name: str, default: str = "") -> str:
    if parent is None:
        return default
    for item in parent.findall("./items/item"):
        if item.get("name") == name:
            return item.text or default
    return default


def _chunk(parent: ET.Element | None, name: str) -> ET.Element | None:
    if parent is None:
        return None
    for candidate in parent.findall("./chunks/chunk"):
        if candidate.get("name") == name:
            return candidate
    return None


def _chunks(parent: ET.Element | None, name: str) -> list[ET.Element]:
    if parent is None:
        return []
    return [
        candidate
        for candidate in parent.findall("./chunks/chunk")
        if candidate.get("name") == name
    ]


def _float_item(parent: ET.Element | None, name: str, default: float = 0.0) -> float:
    raw = _item_text(parent, name)
    return float(raw) if raw else default


def _resolve_definition(component_guid: str, object_name: str) -> dict[str, Any]:
    mapped_key = GH_COMPONENT_GUID_MAPPINGS.get(component_guid.lower())
    if mapped_key:
        return CATALOG_BY_KEY[mapped_key]

    matches = CATALOG_BY_NORMALIZED_NAME.get(_normalized_name(object_name), [])
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise GhxImportError(
            f"Unsupported Grasshopper object '{object_name}' ({component_guid})"
        )
    raise GhxImportError(
        f"Ambiguous Grasshopper object '{object_name}' ({component_guid}); "
        "add an explicit GUID mapping"
    )


def _slider_settings(container: ET.Element, definition: dict[str, Any]) -> dict[str, Any]:
    if definition.get("component") != "NumberSlider":
        return {}
    slider = _chunk(container, "Slider")
    return {"value": _float_item(slider, "Value", 0.0)}


def _object_position(container: ET.Element) -> dict[str, float]:
    attributes = _chunk(container, "Attributes")
    bounds = None
    if attributes is not None:
        for item in attributes.findall("./items/item"):
            if item.get("name") == "Bounds":
                bounds = item
                break
    return {
        "x": float(bounds.findtext("X", "0")) if bounds is not None else 0.0,
        "y": float(bounds.findtext("Y", "0")) if bounds is not None else 0.0,
    }


def parse_ghx_to_graph(graph_id: str, content: bytes) -> dict[str, Any]:
    """Parse mapped GHX nodes, positions, sliders, and wires."""
    if len(content) > MAX_GHX_BYTES:
        raise GhxImportError(f"GHX file exceeds the {MAX_GHX_BYTES // (1024 * 1024)} MB limit")
    lowered = content[:2048].lower()
    if b"<!doctype" in lowered or b"<!entity" in lowered:
        raise GhxImportError("GHX files containing DTD or entity declarations are not supported")

    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise GhxImportError(f"Invalid GHX XML: {exc}") from exc

    definition = _chunk(root, "Definition")
    definition_objects = _chunk(definition, "DefinitionObjects")
    if definition_objects is None:
        raise GhxImportError("GHX archive does not contain DefinitionObjects")

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    source_ports: dict[str, tuple[str, str]] = {}
    pending_sources: list[tuple[str, str, list[str]]] = []

    for object_chunk in _chunks(definition_objects, "Object"):
        component_guid = _item_text(object_chunk, "GUID")
        object_name = _item_text(object_chunk, "Name")
        container = _chunk(object_chunk, "Container")
        if not component_guid or not object_name or container is None:
            raise GhxImportError("GHX object is missing GUID, Name, or Container data")

        definition_record = _resolve_definition(component_guid, object_name)
        instance_guid = _item_text(container, "InstanceGuid").lower()
        if not instance_guid:
            raise GhxImportError(f"Grasshopper object '{object_name}' is missing InstanceGuid")

        node_id = instance_guid
        inputs = definition_record.get("inputs", [])
        outputs = definition_record.get("outputs", [])
        gh_inputs = [
            chunk for chunk in container.findall("./chunks/chunk")
            if chunk.get("name") == "param_input"
        ]
        gh_outputs = [
            chunk for chunk in container.findall("./chunks/chunk")
            if chunk.get("name") == "param_output"
        ]

        if len(gh_inputs) > len(inputs) or len(gh_outputs) > len(outputs):
            raise GhxImportError(
                f"Port layout for '{object_name}' does not match pyhopper's "
                f"{definition_record['component']}"
            )

        nodes.append({
            "id": node_id,
            "kind": "component",
            "componentKey": definition_record["component_key"],
            "component": {
                "tab": definition_record["tab"],
                "category": definition_record["category"],
                "name": definition_record["component"],
            },
            "position": _object_position(container),
            "previewEnabled": True,
            "settings": _slider_settings(container, definition_record),
            "values": {},
            "portOperations": {},
        })

        if outputs:
            source_ports[instance_guid] = (node_id, outputs[0]["name"])

        for gh_output in gh_outputs:
            index = int(gh_output.get("index", "0"))
            param_guid = _item_text(gh_output, "InstanceGuid").lower()
            if param_guid and index < len(outputs):
                source_ports[param_guid] = (node_id, outputs[index]["name"])

        for gh_input in gh_inputs:
            index = int(gh_input.get("index", "0"))
            source_guids = [
                (item.text or "").lower()
                for item in gh_input.findall("./items/item")
                if item.get("name") == "Source" and item.text
            ]
            if source_guids and index < len(inputs):
                pending_sources.append((node_id, inputs[index]["name"], source_guids))

    edge_index = 0
    for target_node_id, target_port, source_guids in pending_sources:
        for source_guid in source_guids:
            source = source_ports.get(source_guid)
            if source is None:
                raise GhxImportError(
                    f"Wire source '{source_guid}' connected to '{target_port}' could not be resolved"
                )
            edge_index += 1
            edges.append({
                "id": f"ghx-edge-{edge_index:04d}",
                "sourceNodeId": source[0],
                "sourcePort": source[1],
                "targetNodeId": target_node_id,
                "targetPort": target_port,
            })

    return {
        "schemaVersion": 2,
        "graphId": graph_id,
        "scene": {"schemaVersion": 3, "objects": {}},
        "viewport": {"x": 0.0, "y": 0.0, "zoom": 1.0},
        "nodes": nodes,
        "edges": edges,
    }


def _flow_node(node: dict[str, Any]) -> dict[str, Any]:
    definition = CATALOG_BY_KEY[node["componentKey"]]
    return {
        "id": node["id"],
        "type": "component",
        "position": node["position"],
        "data": {
            "definition": definition,
            "previewEnabled": node["previewEnabled"],
            "previews": {},
            "settings": node.get("settings", {}),
            "values": node["values"],
            "portOperations": node["portOperations"],
        },
        "selected": False,
    }


def build_ghx_import_payload(
    graph_id: str,
    content: bytes,
    filename: str,
    output_dir: str | Path,
) -> dict[str, Any]:
    """Translate, validate, execute, and package one GHX archive."""
    document = parse_ghx_to_graph(graph_id, content)
    compiled = compile_graph_document(document)
    execution = execute_compiled_graph(compiled, output_dir)
    preview_map = execution["node_previews"]
    flow_nodes = [_flow_node(node) for node in document["nodes"]]

    for node in flow_nodes:
        preview = preview_map.get(node["id"])
        if preview is not None:
            output_name = node["data"]["definition"]["outputs"][0]["name"]
            node["data"]["previews"] = {output_name: preview}

    output_path = execution["output_path"]
    return {
        "graphId": graph_id,
        "schemaVersion": 2,
        "filename": output_path.name,
        "flow": {
            "nodes": flow_nodes,
            "edges": [
                {
                    "id": edge["id"],
                    "source": edge["sourceNodeId"],
                    "sourceHandle": edge["sourcePort"],
                    "target": edge["targetNodeId"],
                    "targetHandle": edge["targetPort"],
                    "animated": False,
                    "className": "wire-edge",
                    "type": "wire",
                    "selected": False,
                }
                for edge in document["edges"]
            ],
            "viewport": document["viewport"],
        },
        "glb_url": "",
        "python_source": compiled.source,
        "render_manifest": {
            "graphId": graph_id,
            "objects": execution["render_manifest"],
        },
        "definition_source": f"Imported from {filename}",
    }
