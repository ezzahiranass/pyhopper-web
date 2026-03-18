from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from flask import Flask, jsonify, send_from_directory

from pyhopper.admin_utils import list_components
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


@app.get("/generated/<path:filename>")
def generated_file(filename: str):
    return send_from_directory(GENERATED_DIR, filename, mimetype="model/gltf-binary")


if __name__ == "__main__":
    app.run(debug=True)
