from __future__ import annotations

from dataclasses import dataclass
from heapq import heappop, heappush
from importlib import import_module
from pathlib import Path
import re
from typing import Any

from pyhopper.Core.Component import Component, InputParam, OutputParam
from pyhopper.Utils.Exporters import export_glb_with_manifest


ENTRYPOINT_NAME = "build_graph_definition"
PREVIEW_OUTPUTS_ENTRYPOINT = "build_graph_preview_outputs"
MERGE_COMPONENT_KEY = "pyhopper.Components.Sets.Tree.Merge.Merge"


class GraphCompilerValidationError(Exception):
    def __init__(self, errors: list[dict[str, str]]) -> None:
        self.errors = errors
        message = errors[0]["message"] if errors else "Graph validation failed"
        super().__init__(message)


@dataclass(frozen=True)
class ResolvedNode:
    node_id: str
    component_key: str
    component_cls: type[Component]
    inputs: list[InputParam]
    outputs: list[OutputParam]
    preview_enabled: bool
    values: dict[str, Any]
    variadic_inputs: bool
    frontend_preset: str | None
    frontend_config: dict[str, Any] | None


@dataclass(frozen=True)
class ValidatedEdge:
    edge_id: str
    source_node_id: str
    source_port: str
    target_node_id: str
    target_port: str


@dataclass(frozen=True)
class CompiledGraph:
    graph_id: str
    source: str
    entrypoint: str = ENTRYPOINT_NAME
    preview_outputs_entrypoint: str = PREVIEW_OUTPUTS_ENTRYPOINT


def _error(path: str, message: str, code: str = "invalid_graph") -> dict[str, str]:
    return {
        "code": code,
        "path": path,
        "message": message,
    }


def _snake_case(value: str) -> str:
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value)
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
    return normalized or "component"


def _resolve_component(component_key: str) -> type[Component]:
    module_name, _, class_name = component_key.rpartition(".")
    if not module_name or not class_name:
        raise ImportError(f"Invalid component key '{component_key}'")

    module = import_module(module_name)
    component_cls = getattr(module, class_name)
    if not isinstance(component_cls, type) or not issubclass(component_cls, Component):
        raise TypeError(f"{component_key} is not a pyhopper Component")
    return component_cls


def _literal_expression(value: Any) -> str:
    if isinstance(value, bool):
        raise ValueError("Boolean literals are not supported in v1 graph values")
    if isinstance(value, (int, float)):
        return repr(float(value) if isinstance(value, float) else value)
    if value is None:
        return "None"
    if isinstance(value, str):
        return repr(value)
    raise ValueError(f"Unsupported literal value: {type(value).__name__}")


def _output_expression(variable_name: str, port_name: str, primary_output_name: str) -> str:
    if port_name == primary_output_name:
        return variable_name
    if port_name.isidentifier():
        return f"{variable_name}.{port_name}"
    return f"{variable_name}.output({port_name!r})"


def _slider_value(node: ResolvedNode) -> float:
    output_name = node.outputs[0].name if node.outputs else "value"
    raw_value = node.values.get(output_name)
    if isinstance(raw_value, bool):
        raise GraphCompilerValidationError(
            [_error(f"nodes[{node.node_id}].values.{output_name}", "Slider value must be numeric")]
        )
    if isinstance(raw_value, (int, float)):
        return float(raw_value)

    config_value = (node.frontend_config or {}).get("value")
    if isinstance(config_value, (int, float)) and not isinstance(config_value, bool):
        return float(config_value)

    default_value = getattr(node.component_cls, "DEFAULT_VALUE", None)
    if isinstance(default_value, (int, float)) and not isinstance(default_value, bool):
        return float(default_value)

    return 0.0


def _sanitize_filename(graph_id: str) -> str:
    safe_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", graph_id).strip("-").lower()
    return safe_id or "graph"


def _validate_document(document: Any) -> tuple[str, dict[str, ResolvedNode], list[ValidatedEdge]]:
    errors: list[dict[str, str]] = []

    if not isinstance(document, dict):
        raise GraphCompilerValidationError([_error("", "Graph document must be a JSON object")])

    schema_version = document.get("schemaVersion")
    if schema_version != 1:
        errors.append(_error("schemaVersion", "Only schemaVersion 1 is supported"))

    graph_id = document.get("graphId")
    if not isinstance(graph_id, str) or not graph_id:
        errors.append(_error("graphId", "graphId must be a non-empty string"))

    viewport = document.get("viewport")
    if not isinstance(viewport, dict):
        errors.append(_error("viewport", "viewport must be an object"))
    else:
        for key in ("x", "y", "zoom"):
            if not isinstance(viewport.get(key), (int, float)) or isinstance(viewport.get(key), bool):
                errors.append(_error(f"viewport.{key}", f"viewport.{key} must be numeric"))

    raw_nodes = document.get("nodes")
    if not isinstance(raw_nodes, list):
        errors.append(_error("nodes", "nodes must be an array"))
        raw_nodes = []

    raw_edges = document.get("edges")
    if not isinstance(raw_edges, list):
        errors.append(_error("edges", "edges must be an array"))
        raw_edges = []

    resolved_nodes: dict[str, ResolvedNode] = {}
    seen_node_ids: set[str] = set()

    for index, raw_node in enumerate(raw_nodes):
        path = f"nodes[{index}]"
        if not isinstance(raw_node, dict):
            errors.append(_error(path, "Each node must be an object"))
            continue

        node_id = raw_node.get("id")
        if not isinstance(node_id, str) or not node_id:
            errors.append(_error(f"{path}.id", "Node id must be a non-empty string"))
            continue
        if node_id in seen_node_ids:
            errors.append(_error(f"{path}.id", f"Duplicate node id '{node_id}'"))
            continue
        seen_node_ids.add(node_id)

        component_key = raw_node.get("componentKey")
        if not isinstance(component_key, str) or not component_key:
            errors.append(_error(f"{path}.componentKey", "componentKey must be a non-empty string"))
            continue

        if raw_node.get("kind") != "component":
            errors.append(_error(f"{path}.kind", "Node kind must be 'component'"))

        position = raw_node.get("position")
        if not isinstance(position, dict):
            errors.append(_error(f"{path}.position", "position must be an object"))
        else:
            for axis in ("x", "y"):
                if not isinstance(position.get(axis), (int, float)) or isinstance(position.get(axis), bool):
                    errors.append(_error(f"{path}.position.{axis}", f"position.{axis} must be numeric"))

        preview_enabled = raw_node.get("previewEnabled", True)
        if not isinstance(preview_enabled, bool):
            errors.append(_error(f"{path}.previewEnabled", "previewEnabled must be a boolean"))
            preview_enabled = True

        raw_values = raw_node.get("values", {})
        if not isinstance(raw_values, dict):
            errors.append(_error(f"{path}.values", "values must be an object"))
            continue
        values = dict(raw_values)

        try:
            component_cls = _resolve_component(component_key)
        except Exception as exc:  # pragma: no cover - defensive resolution guard
            errors.append(_error(f"{path}.componentKey", f"Failed to resolve component '{component_key}': {exc}"))
            continue

        outputs = list(getattr(component_cls, "outputs", []))
        frontend_preset = getattr(component_cls, "frontend_preset", None)
        frontend_config = getattr(component_cls, "frontend_config", None)

        if frontend_preset == "number-slider":
            output_name = outputs[0].name if outputs else "value"
            for key, value in values.items():
                if key != output_name:
                    errors.append(_error(f"{path}.values.{key}", "Only the slider's primary output value may be authored"))
                    continue
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    errors.append(_error(f"{path}.values.{key}", "Slider values must be numeric"))
        elif values:
            for key in values.keys():
                errors.append(
                    _error(
                        f"{path}.values.{key}",
                        "Literal node values are only supported for slider-backed preset nodes in v1",
                    )
                )

        resolved_nodes[node_id] = ResolvedNode(
            node_id=node_id,
            component_key=component_key,
            component_cls=component_cls,
            inputs=list(getattr(component_cls, "inputs", [])),
            outputs=outputs,
            preview_enabled=preview_enabled,
            values=values,
            variadic_inputs=bool(getattr(component_cls, "variadic_inputs", False)),
            frontend_preset=frontend_preset,
            frontend_config=frontend_config if isinstance(frontend_config, dict) else None,
        )

    validated_edges: list[ValidatedEdge] = []
    seen_edge_ids: set[str] = set()

    for index, raw_edge in enumerate(raw_edges):
        path = f"edges[{index}]"
        if not isinstance(raw_edge, dict):
            errors.append(_error(path, "Each edge must be an object"))
            continue

        edge_id = raw_edge.get("id")
        if not isinstance(edge_id, str) or not edge_id:
            errors.append(_error(f"{path}.id", "Edge id must be a non-empty string"))
            continue
        if edge_id in seen_edge_ids:
            errors.append(_error(f"{path}.id", f"Duplicate edge id '{edge_id}'"))
            continue
        seen_edge_ids.add(edge_id)

        source_node_id = raw_edge.get("sourceNodeId")
        source_port = raw_edge.get("sourcePort")
        target_node_id = raw_edge.get("targetNodeId")
        target_port = raw_edge.get("targetPort")

        if not isinstance(source_node_id, str) or source_node_id not in resolved_nodes:
            errors.append(_error(f"{path}.sourceNodeId", f"Unknown source node '{source_node_id}'"))
            continue
        if not isinstance(target_node_id, str) or target_node_id not in resolved_nodes:
            errors.append(_error(f"{path}.targetNodeId", f"Unknown target node '{target_node_id}'"))
            continue
        if not isinstance(source_port, str) or not source_port:
            errors.append(_error(f"{path}.sourcePort", "sourcePort must be a non-empty string"))
            continue
        if not isinstance(target_port, str) or not target_port:
            errors.append(_error(f"{path}.targetPort", "targetPort must be a non-empty string"))
            continue

        source_outputs = {output.name for output in resolved_nodes[source_node_id].outputs}
        if source_port not in source_outputs:
            errors.append(
                _error(
                    f"{path}.sourcePort",
                    f"Output '{source_port}' does not exist on node '{source_node_id}'",
                )
            )
            continue

        target_inputs = {input_param.name for input_param in resolved_nodes[target_node_id].inputs}
        if target_port not in target_inputs:
            errors.append(
                _error(
                    f"{path}.targetPort",
                    f"Input '{target_port}' does not exist on node '{target_node_id}'",
                )
            )
            continue

        validated_edges.append(
            ValidatedEdge(
                edge_id=edge_id,
                source_node_id=source_node_id,
                source_port=source_port,
                target_node_id=target_node_id,
                target_port=target_port,
            )
        )

    incoming_by_port: dict[tuple[str, str], list[ValidatedEdge]] = {}
    outgoing_by_node: dict[str, list[ValidatedEdge]] = {}

    for edge in validated_edges:
        incoming_by_port.setdefault((edge.target_node_id, edge.target_port), []).append(edge)
        outgoing_by_node.setdefault(edge.source_node_id, []).append(edge)

    for node in resolved_nodes.values():
        last_input_name = node.inputs[-1].name if node.inputs else None
        for input_param in node.inputs:
            incoming = incoming_by_port.get((node.node_id, input_param.name), [])
            if len(incoming) > 1 and not (node.variadic_inputs and input_param.name == last_input_name):
                errors.append(
                    _error(
                        f"nodes[{node.node_id}].inputs.{input_param.name}",
                        f"Input '{input_param.name}' accepts only one incoming edge",
                    )
                )
            if incoming:
                continue
            if input_param.default is not None or input_param.optional:
                continue
            if node.variadic_inputs and input_param.name == last_input_name:
                continue
            errors.append(
                _error(
                    f"nodes[{node.node_id}].inputs.{input_param.name}",
                    f"Required input '{input_param.name}' is missing",
                )
            )

    if errors:
        raise GraphCompilerValidationError(errors)

    return graph_id, resolved_nodes, validated_edges  # type: ignore[return-value]


def _topological_order(
    nodes: dict[str, ResolvedNode],
    edges: list[ValidatedEdge],
) -> list[str]:
    indegree = {node_id: 0 for node_id in nodes}
    adjacency: dict[str, list[tuple[str, str]]] = {node_id: [] for node_id in nodes}

    for edge in edges:
        indegree[edge.target_node_id] += 1
        adjacency[edge.source_node_id].append((edge.target_node_id, edge.edge_id))

    heap: list[str] = []
    for node_id, degree in indegree.items():
        if degree == 0:
            heappush(heap, node_id)

    ordered: list[str] = []
    while heap:
        node_id = heappop(heap)
        ordered.append(node_id)
        for target_node_id, _ in sorted(adjacency[node_id], key=lambda item: (item[0], item[1])):
            indegree[target_node_id] -= 1
            if indegree[target_node_id] == 0:
                heappush(heap, target_node_id)

    if len(ordered) != len(nodes):
        raise GraphCompilerValidationError(
            [_error("edges", "The graph contains a cycle and cannot be compiled", code="cyclic_graph")]
        )

    return ordered


def compile_graph_document(document: Any) -> CompiledGraph:
    print("compile_graph_document: validating graph document")
    graph_id, nodes, edges = _validate_document(document)
    print(
        "compile_graph_document: validation passed",
        {
            "graphId": graph_id,
            "nodeCount": len(nodes),
            "edgeCount": len(edges),
        },
    )
    ordered_node_ids = _topological_order(nodes, edges)
    print("compile_graph_document: topological order", ordered_node_ids)
    order_index = {node_id: index for index, node_id in enumerate(ordered_node_ids)}
    incoming_by_port: dict[tuple[str, str], list[ValidatedEdge]] = {}
    outgoing_by_node: dict[str, list[ValidatedEdge]] = {}

    for edge in edges:
        incoming_by_port.setdefault((edge.target_node_id, edge.target_port), []).append(edge)
        outgoing_by_node.setdefault(edge.source_node_id, []).append(edge)

    imports: set[tuple[str, str]] = set()
    variable_names: dict[str, str] = {}
    lines: list[str] = []

    for index, node_id in enumerate(ordered_node_ids):
        node = nodes[node_id]
        variable_name = f"node_{index:03d}_{_snake_case(node.component_cls.__name__)}"
        variable_names[node_id] = variable_name

        if node.frontend_preset == "number-slider":
            slider_value = _slider_value(node)
            lines.append(f"{variable_name} = {_literal_expression(slider_value)}")
            continue

        module_name, _, class_name = node.component_key.rpartition(".")
        imports.add((module_name, class_name))

        if node.variadic_inputs and node.inputs:
            variadic_port = node.inputs[-1].name
            variadic_edges = sorted(
                incoming_by_port.get((node.node_id, variadic_port), []),
                key=lambda edge: (
                    order_index[edge.source_node_id],
                    edge.edge_id,
                ),
            )
            arguments = [
                _output_expression(
                    variable_names[edge.source_node_id],
                    edge.source_port,
                    nodes[edge.source_node_id].outputs[0].name,
                )
                for edge in variadic_edges
            ]
            call_arguments = ", ".join(arguments)
            lines.append(f"{variable_name} = {class_name}({call_arguments})")
            continue

        keyword_arguments: list[str] = []
        for input_param in node.inputs:
            connected_edges = incoming_by_port.get((node.node_id, input_param.name), [])
            if connected_edges:
                edge = connected_edges[0]
                source_node = nodes[edge.source_node_id]
                argument_expression = _output_expression(
                    variable_names[edge.source_node_id],
                    edge.source_port,
                    source_node.outputs[0].name,
                )
                keyword_arguments.append(f"{input_param.name}={argument_expression}")

        joined_arguments = ", ".join(keyword_arguments)
        lines.append(f"{variable_name} = {class_name}({joined_arguments})")

    preview_node_ids = [
        node_id
        for node_id in ordered_node_ids
        if nodes[node_id].preview_enabled
    ]

    if not preview_node_ids:
        raise GraphCompilerValidationError(
            [_error("nodes", "Graph does not contain any preview-enabled nodes", code="missing_output")]
        )

    merge_module, _, merge_class = MERGE_COMPONENT_KEY.rpartition(".")
    if len(preview_node_ids) > 1:
        imports.add((merge_module, merge_class))

    print("compile_graph_document: preview nodes", preview_node_ids)

    import_lines = [f"from {module_name} import {class_name}" for module_name, class_name in sorted(imports)]
    preview_output_lines = [
        f"        {node_id!r}: {variable_names[node_id]},"
        for node_id in preview_node_ids
    ]
    source_lines = [
        "from __future__ import annotations",
        "",
        *import_lines,
        "",
        f"def {PREVIEW_OUTPUTS_ENTRYPOINT}():",
        *[f"    {line}" for line in lines],
        "    return {",
        *preview_output_lines,
        "    }",
        "",
        f"def {ENTRYPOINT_NAME}():",
        f"    preview_outputs = {PREVIEW_OUTPUTS_ENTRYPOINT}()",
        "    preview_values = list(preview_outputs.values())",
        "    if len(preview_values) == 1:",
        "        return preview_values[0]",
        f"    return {merge_class}(*preview_values)",
        "",
    ]

    return CompiledGraph(
        graph_id=graph_id,
        source="\n".join(source_lines),
    )


def execute_compiled_graph(
    compiled_graph: CompiledGraph,
    output_dir: str | Path,
) -> dict[str, Any]:
    print("execute_compiled_graph: executing generated python")
    namespace: dict[str, Any] = {}
    exec(compiled_graph.source, namespace, namespace)
    preview_outputs = namespace[compiled_graph.preview_outputs_entrypoint]()
    if not isinstance(preview_outputs, dict) or not preview_outputs:
        raise RuntimeError("Compiled graph did not produce any preview outputs")
    print("execute_compiled_graph: preview outputs", list(preview_outputs.keys()))

    target_dir = Path(output_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    output_path = target_dir / f"{_sanitize_filename(compiled_graph.graph_id)}.glb"
    render_manifest = export_glb_with_manifest(preview_outputs, output_path)
    print("execute_compiled_graph: export_glb completed", output_path)
    print("execute_compiled_graph: render manifest entries", len(render_manifest))

    return {
        "compiled_graph": compiled_graph,
        "output_path": output_path,
        "render_manifest": render_manifest,
    }
