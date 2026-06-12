from __future__ import annotations

import ast
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pyhopper.admin_utils import list_components

from graph_compiler import compile_graph_document, execute_compiled_graph


PORT_OP_NAMES = {
    "graft": "Graft",
    "simplify": "Simplify",
    "flatten": "Flatten",
    "reverse": "Reverse",
    "reparametrize": "Reparametrize",
}

TEST_DEFINITION_SOURCE = """from pyhopper import UnitX, UnitY, ConstructPlane, Polygon, Merge
from pyhopper import Panel
from pyhopper.Components.Curve.Primitive.Circle import Circle

x_axis = UnitX()
y_axis = UnitY()
plane = ConstructPlane(x_axis=x_axis, y_axis=y_axis)
circle = Circle(2.0, plane)
polygon = Polygon(plane, 1.5, 6, 0.0)
scene = Merge(circle, polygon)
panel = Panel(scene)
"""

REPO_ROOT = Path(__file__).resolve().parents[2]
DECLARATIVE_DEFINITION_PATH = REPO_ROOT / "DECLARATIVE_DEFINITION.md"

_CATALOG_RAW = list_components()


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
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


CATALOG = [_json_safe(item) for item in _CATALOG_RAW]
CATALOG_BY_KEY = {item["component_key"]: item for item in CATALOG}
CATALOG_BY_COMPONENT: dict[str, list[dict[str, Any]]] = defaultdict(list)
for _definition in CATALOG:
    CATALOG_BY_COMPONENT[_definition["component"]].append(_definition)


def _resolve_component(
    component_name: str,
    imported_components: dict[str, str] | None = None,
) -> dict[str, Any]:
    imported_key = (imported_components or {}).get(component_name)
    if imported_key:
        return CATALOG_BY_KEY[imported_key]

    if component_name in CATALOG_BY_KEY:
        return CATALOG_BY_KEY[component_name]

    matches = CATALOG_BY_COMPONENT.get(component_name, [])
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise ValueError(f"Unknown component '{component_name}'")

    choices = ", ".join(sorted(item["component_key"] for item in matches))
    raise ValueError(
        f"Ambiguous component '{component_name}'. Import one explicitly: {choices}"
    )


NUMBER_SLIDER_DEF = _resolve_component("NumberSlider")


@dataclass
class NodeRecord:
    variable_name: str
    node_id: str
    definition: dict[str, Any]
    values: dict[str, Any]
    port_operations: dict[str, str]


def _primary_output_name(definition: dict[str, Any]) -> str:
    outputs = definition.get("outputs", [])
    if outputs:
        return outputs[0]["name"]
    return "value"


def _node_payload(record: NodeRecord) -> dict[str, Any]:
    return {
        "id": record.node_id,
        "type": "component",
        "position": {"x": 0.0, "y": 0.0},
        "data": {
            "definition": record.definition,
            "previewEnabled": True,
            "previews": {},
            "values": record.values,
            "portOperations": record.port_operations,
        },
        "selected": False,
    }


def _replace_node_payload(nodes: list[dict[str, Any]], record: NodeRecord) -> None:
    payload = _node_payload(record)
    for index, node in enumerate(nodes):
        if node["id"] == record.node_id:
            nodes[index] = payload
            return
    raise ValueError(f"Node '{record.node_id}' was not found for payload replacement")


def _create_slider_node(
    nodes: list[dict[str, Any]],
    node_records: dict[str, NodeRecord],
    node_order: list[str],
    slider_cache: dict[str, str],
    key: str,
    value: float,
) -> str:
    existing = slider_cache.get(key)
    if existing:
        return existing

    node_id = f"literal-{len(node_order):03d}-{key}"
    record = NodeRecord(
        variable_name=node_id,
        node_id=node_id,
        definition=NUMBER_SLIDER_DEF,
        values={_primary_output_name(NUMBER_SLIDER_DEF): value},
        port_operations={},
    )
    nodes.append(_node_payload(record))
    node_records[node_id] = record
    node_order.append(node_id)
    slider_cache[key] = node_id
    return node_id


def _safe_numeric(value: ast.AST) -> float | None:
    if isinstance(value, ast.Constant) and isinstance(value.value, (int, float)) and not isinstance(value.value, bool):
        return float(value.value)
    return None


def get_definition_contract_markdown() -> str:
    return DECLARATIVE_DEFINITION_PATH.read_text(encoding="utf-8")


def parse_definition_to_graph(project_id: str, source: str) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    tree = ast.parse(source)
    imported_components: dict[str, str] = {}
    for statement in tree.body:
        if not isinstance(statement, ast.ImportFrom) or not statement.module:
            continue
        for imported_name in statement.names:
            local_name = imported_name.asname or imported_name.name
            possible_keys = (
                f"{statement.module}.{imported_name.name}",
                f"{statement.module}.{imported_name.name}.{imported_name.name}",
            )
            for possible_key in possible_keys:
                if possible_key in CATALOG_BY_KEY:
                    imported_components[local_name] = possible_key
                    break

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    node_records: dict[str, NodeRecord] = {}
    node_order: list[str] = []
    literal_bindings: dict[str, float] = {}
    slider_cache: dict[str, str] = {}
    edge_count = 0

    def create_edge(source_node_id: str, source_port: str, target_node_id: str, target_port: str) -> None:
        nonlocal edge_count
        edge_count += 1
        edges.append({
            "id": f"edge-{edge_count:03d}",
            "source": source_node_id,
            "sourceHandle": source_port,
            "target": target_node_id,
            "targetHandle": target_port,
            "animated": False,
            "className": "wire-edge",
            "type": "wire",
            "selected": False,
        })

    def connect_expression(expr: ast.AST, target: NodeRecord, input_name: str) -> None:
        if isinstance(expr, ast.Name):
            if expr.id in node_records:
                source_record = node_records[expr.id]
                create_edge(source_record.node_id, _primary_output_name(source_record.definition), target.node_id, input_name)
                return
            if expr.id in literal_bindings:
                slider_node_id = _create_slider_node(
                    nodes,
                    node_records,
                    node_order,
                    slider_cache,
                    expr.id,
                    literal_bindings[expr.id],
                )
                create_edge(slider_node_id, _primary_output_name(NUMBER_SLIDER_DEF), target.node_id, input_name)
                return
            raise ValueError(f"Unknown reference '{expr.id}'")

        literal_value = _safe_numeric(expr)
        if literal_value is not None:
            slider_node_id = _create_slider_node(
                nodes,
                node_records,
                node_order,
                slider_cache,
                f"{target.node_id}-{input_name}",
                literal_value,
            )
            create_edge(slider_node_id, _primary_output_name(NUMBER_SLIDER_DEF), target.node_id, input_name)
            return

        if (
            isinstance(expr, ast.Call)
            and isinstance(expr.func, ast.Attribute)
            and isinstance(expr.func.value, ast.Name)
            and not expr.args
            and not expr.keywords
        ):
            op_name = PORT_OP_NAMES.get(expr.func.attr)
            if not op_name:
                raise ValueError(f"Unsupported input operation '{expr.func.attr}'")
            connect_expression(expr.func.value, target, input_name)
            target.port_operations[f"input:{input_name}"] = op_name
            return

        raise ValueError(f"Unsupported input expression: {ast.dump(expr)}")

    for statement in tree.body:
        if isinstance(statement, (ast.Import, ast.ImportFrom)):
            continue

        if isinstance(statement, ast.Assign):
            if len(statement.targets) != 1 or not isinstance(statement.targets[0], ast.Name):
                raise ValueError("Only single-name assignments are supported")

            variable_name = statement.targets[0].id
            numeric_literal = _safe_numeric(statement.value)
            if numeric_literal is not None:
                literal_bindings[variable_name] = numeric_literal
                continue

            if not isinstance(statement.value, ast.Call) or not isinstance(statement.value.func, ast.Name):
                raise ValueError(f"Unsupported assignment value for '{variable_name}'")

            component_name = statement.value.func.id
            definition = _resolve_component(component_name, imported_components)

            record = NodeRecord(
                variable_name=variable_name,
                node_id=variable_name,
                definition=definition,
                values={},
                port_operations={},
            )
            nodes.append(_node_payload(record))
            node_records[variable_name] = record
            node_order.append(variable_name)

            inputs = definition.get("inputs", [])
            if definition.get("frontend_preset") == "number-slider":
                output_name = _primary_output_name(definition)
                record.values[output_name] = definition.get("frontend_config", {}).get("value", 0.5)
                if statement.value.args:
                    numeric = _safe_numeric(statement.value.args[0])
                    if numeric is not None:
                        record.values[output_name] = numeric
                for keyword in statement.value.keywords:
                    if keyword.arg == output_name:
                        numeric = _safe_numeric(keyword.value)
                        if numeric is not None:
                            record.values[output_name] = numeric
                _replace_node_payload(nodes, record)
                continue

            positional_names = [input_def["name"] for input_def in inputs[: len(statement.value.args)]]
            for input_name, expr in zip(positional_names, statement.value.args):
                connect_expression(expr, record, input_name)

            for keyword in statement.value.keywords:
                if keyword.arg is None:
                    raise ValueError("**kwargs are not supported")
                connect_expression(keyword.value, record, keyword.arg)

            _replace_node_payload(nodes, record)
            continue

        if isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Call):
            call = statement.value
            if (
                isinstance(call.func, ast.Attribute)
                and isinstance(call.func.value, ast.Name)
                and not call.args
                and not call.keywords
            ):
                op_name = PORT_OP_NAMES.get(call.func.attr)
                if not op_name:
                    raise ValueError(f"Unsupported output operation '{call.func.attr}'")
                variable_name = call.func.value.id
                if variable_name not in node_records:
                    raise ValueError(f"Unknown output operation target '{variable_name}'")
                record = node_records[variable_name]
                record.port_operations[f"output:{_primary_output_name(record.definition)}"] = op_name
                for index, node in enumerate(nodes):
                    if node["id"] == record.node_id:
                        nodes[index] = _node_payload(record)
                        break
                continue

        raise ValueError(f"Unsupported statement: {ast.dump(statement)}")

    graph_document = {
        "schemaVersion": 2,
        "graphId": project_id,
        "scene": {"schemaVersion": 3, "objects": {}},
        "viewport": {"x": 0.0, "y": 0.0, "zoom": 1.0},
        "nodes": [
            {
                "id": node["id"],
                "kind": "component",
                "componentKey": node["data"]["definition"]["component_key"],
                "component": {
                    "tab": node["data"]["definition"]["tab"],
                    "category": node["data"]["definition"]["category"],
                    "name": node["data"]["definition"]["component"],
                },
                "position": node["position"],
                "previewEnabled": node["data"]["previewEnabled"],
                "values": node["data"]["values"],
                "portOperations": node["data"]["portOperations"],
            }
            for node in nodes
        ],
        "edges": [
            {
                "id": edge["id"],
                "sourceNodeId": edge["source"],
                "sourcePort": edge["sourceHandle"],
                "targetNodeId": edge["target"],
                "targetPort": edge["targetHandle"],
            }
            for edge in edges
        ],
    }

    depth_by_node: dict[str, int] = {}
    incoming_by_target: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        incoming_by_target[edge["target"]].append(edge["source"])

    def depth_for(node_id: str) -> int:
        existing = depth_by_node.get(node_id)
        if existing is not None:
            return existing

        sources = incoming_by_target.get(node_id, [])
        depth = max((depth_for(source) for source in sources), default=-1) + 1
        depth_by_node[node_id] = depth
        return depth

    for node_id in node_order:
        depth_for(node_id)

    row_by_depth: dict[int, int] = defaultdict(int)
    for node in nodes:
        depth = depth_by_node.get(node["id"], 0)
        row = row_by_depth[depth]
        row_by_depth[depth] += 1
        node["position"] = {"x": float(depth * 260), "y": float(row * 140)}

    return graph_document, nodes, edges


def build_definition_import_payload(
    project_id: str,
    definition_source: str,
    output_dir: str | Path,
) -> dict[str, Any]:
    graph_document, nodes, edges = parse_definition_to_graph(project_id, definition_source)
    compiled_graph = compile_graph_document(graph_document)
    execution_payload = execute_compiled_graph(compiled_graph, output_dir)

    node_preview_map = execution_payload["node_previews"]
    for node in nodes:
        outputs = node["data"]["definition"].get("outputs", [])
        primary_output_name = outputs[0]["name"] if outputs else "value"
        if node["id"] in node_preview_map:
            node["data"]["previews"] = {
                primary_output_name: node_preview_map[node["id"]],
            }

    output_path = execution_payload["output_path"]
    return {
        "graphId": project_id,
        "schemaVersion": 2,
        "flow": {
            "nodes": nodes,
            "edges": edges,
            "viewport": {"x": 0.0, "y": 0.0, "zoom": 1.0},
        },
        "glb_url": f"http://127.0.0.1:8000/generated/{output_path.name}?v={output_path.stat().st_mtime_ns}",
        "python_source": compiled_graph.source,
        "render_manifest": {
            "graphId": project_id,
            "objects": execution_payload["render_manifest"],
        },
        "definition_source": definition_source,
    }


def build_test_import_payload(project_id: str, output_dir: str | Path) -> dict[str, Any]:
    return build_definition_import_payload(project_id, TEST_DEFINITION_SOURCE, output_dir)
