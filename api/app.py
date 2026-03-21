from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from flask import Flask, jsonify, request, send_from_directory

from pyhopper.admin_utils import list_components
from graph_compiler import (
    GraphCompilerValidationError,
    compile_graph_document,
    execute_compiled_graph,
)
from test import run_test_export


app = Flask(__name__)
GENERATED_DIR = Path(__file__).with_name("generated")


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/components")
def components():
    payload = list_components()
    print("pyhopper components:", payload)
    return jsonify(payload)


@app.get("/test-glb")
def test_glb():
    payload = run_test_export(GENERATED_DIR)
    print("pyhopper test export:", payload)
    return jsonify({
        **payload,
        "glb_url": f"http://127.0.0.1:5000/generated/{payload['filename']}?v={GENERATED_DIR.joinpath(payload['filename']).stat().st_mtime_ns}",
    })


@app.post("/graphs/export")
def export_graph():
    document = request.get_json(silent=True)
    print("POST /graphs/export called")
    if document is None:
        print("Export request body was not valid JSON")
        return jsonify({
            "error": {
                "code": "invalid_json",
                "message": "Request body must be valid JSON",
            }
        }), 400

    try:
        print(
            "Export request summary:",
            {
                "graphId": document.get("graphId"),
                "schemaVersion": document.get("schemaVersion"),
                "nodeCount": len(document.get("nodes", [])) if isinstance(document.get("nodes"), list) else "invalid",
                "edgeCount": len(document.get("edges", [])) if isinstance(document.get("edges"), list) else "invalid",
            },
        )
        compiled_graph = compile_graph_document(document)
        print("Graph compiled successfully")
        payload = execute_compiled_graph(compiled_graph, GENERATED_DIR)
        output_path = payload["output_path"]
        print("Graph export wrote GLB:", output_path)

        return jsonify({
            "graphId": compiled_graph.graph_id,
            "schemaVersion": document.get("schemaVersion"),
            "filename": output_path.name,
            "path": str(output_path),
            "size": output_path.stat().st_size,
            "glb_url": f"http://127.0.0.1:5000/generated/{output_path.name}?v={output_path.stat().st_mtime_ns}",
            "node_previews": payload["node_previews"],
            "python_source": compiled_graph.source,
            "render_manifest": {
                "graphId": compiled_graph.graph_id,
                "objects": payload["render_manifest"],
            },
        })
    except GraphCompilerValidationError as exc:
        print("Graph validation failed:", exc.errors)
        return jsonify({
            "error": {
                "code": "graph_validation_failed",
                "message": "Graph validation failed",
            },
            "errors": exc.errors,
        }), 400
    except Exception as exc:  # pragma: no cover - runtime/export guard
        print("Graph export failed with runtime error:", repr(exc))
        return jsonify({
            "error": {
                "code": "graph_export_failed",
                "message": str(exc),
            }
        }), 500


@app.get("/generated/<path:filename>")
def generated_file(filename: str):
    return send_from_directory(GENERATED_DIR, filename, mimetype="model/gltf-binary")


if __name__ == "__main__":
    app.run(debug=True)
