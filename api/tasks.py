from __future__ import annotations

from pathlib import Path
import sys
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from celery_app import celery_app
from graph_compiler import GraphCompilerValidationError, compile_graph_document, execute_compiled_graph
from test import run_test_export


GENERATED_DIR = Path(__file__).with_name("generated")


def _export_graph_payload(document: dict[str, Any]) -> dict[str, Any]:
    compiled_graph = compile_graph_document(document)
    payload = execute_compiled_graph(compiled_graph, GENERATED_DIR)
    output_path = payload["output_path"]
    return {
        "graphId": compiled_graph.graph_id,
        "schemaVersion": document.get("schemaVersion"),
        "filename": output_path.name,
        "path": str(output_path),
        "size": output_path.stat().st_size,
        "node_previews": payload["node_previews"],
        "python_source": compiled_graph.source,
        "render_manifest": {
            "graphId": compiled_graph.graph_id,
            "objects": payload["render_manifest"],
        },
    }


@celery_app.task(name="pyhopper.export_graph")
def export_graph_task(document: dict[str, Any]) -> dict[str, Any]:
    try:
        return {"status": "success", "payload": _export_graph_payload(document)}
    except GraphCompilerValidationError as exc:
        return {"status": "validation_error", "errors": exc.errors}
    except Exception as exc:  # pragma: no cover - celery runtime guard
        return {"status": "error", "message": str(exc)}


@celery_app.task(name="pyhopper.test_export")
def run_test_export_task() -> dict[str, Any]:
    try:
        return {"status": "success", "payload": run_test_export(GENERATED_DIR)}
    except Exception as exc:  # pragma: no cover - celery runtime guard
        return {"status": "error", "message": str(exc)}