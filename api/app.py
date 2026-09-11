from __future__ import annotations

from pathlib import Path
import os
import sys
from typing import Any
from urllib.parse import unquote
from uuid import uuid4

from celery.exceptions import TimeoutError as CeleryTimeoutError
from celery.result import AsyncResult
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ai import generate_chat_reply
from celery_app import celery_app
from definition_importer import build_test_import_payload
from ghx_importer import GhxImportError, MAX_GHX_BYTES, build_ghx_import_payload
from pyhopper.admin_utils import list_components
from tasks import export_graph_task, run_test_export_task

load_dotenv(Path(__file__).with_name(".env"))


GENERATED_DIR = Path(__file__).with_name("generated")
DEFAULT_PUBLIC_BASE_URL = os.getenv("PYHOPPER_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
EXPORT_TASK_TIMEOUT_SECONDS = float(os.getenv("PYHOPPER_EXPORT_TASK_TIMEOUT", "300"))

app = FastAPI(title="Pyhopper Web API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _public_base_url(request: Request) -> str:
    configured = os.getenv("PYHOPPER_API_BASE_URL")
    if configured:
        return configured.rstrip("/")
    return str(request.base_url).rstrip("/") or DEFAULT_PUBLIC_BASE_URL


def _generated_glb_url(request: Request, filename: str) -> str:
    target_path = GENERATED_DIR / filename
    version = target_path.stat().st_mtime_ns
    return f"{_public_base_url(request)}/generated/{filename}?v={version}"


def _error_response(status_code: int, code: str, message: str, *, errors: list[dict[str, str]] | None = None) -> JSONResponse:
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if errors is not None:
        payload["errors"] = errors
    return JSONResponse(status_code=status_code, content=payload)


def _resolve_generated_file(filename: str) -> Path:
    generated_root = GENERATED_DIR.resolve()
    candidate = (GENERATED_DIR / filename).resolve()
    if generated_root != candidate and generated_root not in candidate.parents:
        raise HTTPException(status_code=404, detail="File not found")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return candidate


def _normalize_task_payload(task_payload: Any, request: Request) -> dict[str, Any]:
    if not isinstance(task_payload, dict):
        raise RuntimeError("Task returned an invalid payload")

    status = task_payload.get("status")
    if status == "success":
        payload = task_payload.get("payload")
        if not isinstance(payload, dict):
            raise RuntimeError("Task returned an invalid success payload")
        filename = payload.get("filename")
        if isinstance(filename, str) and filename:
            payload["glb_url"] = _generated_glb_url(request, filename)
        return payload

    if status == "validation_error":
        errors = task_payload.get("errors")
        raise ValueError(errors if isinstance(errors, list) else [])

    message = task_payload.get("message")
    raise RuntimeError(message if isinstance(message, str) and message else "Task failed")


async def _read_json_body(request: Request) -> Any:
    try:
        return await request.json()
    except Exception:
        return None


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "broker": celery_app.conf.broker_url,
        "backend": celery_app.conf.result_backend,
    }


@app.get("/components")
async def components() -> Any:
    return await run_in_threadpool(list_components)


@app.post("/ai/chat")
async def ai_chat(request: Request) -> JSONResponse:
    payload = await _read_json_body(request)
    print("[ai/chat] request received")
    if payload is None:
        print("[ai/chat] invalid json")
        return _error_response(400, "invalid_json", "Request body must be valid JSON")

    messages = payload.get("messages") if isinstance(payload, dict) else None
    if not isinstance(messages, list):
        print("[ai/chat] invalid messages payload:", type(messages).__name__)
        return _error_response(400, "invalid_messages", "messages must be a list")

    try:
        print("[ai/chat] message_count:", len(messages))
        project_context = payload.get("projectContext") if isinstance(payload, dict) else None
        result = await run_in_threadpool(
            generate_chat_reply,
            messages,
            project_context=project_context if isinstance(project_context, dict) else None,
        )
        print("[ai/chat] reply generated:", result.reply[:200])
        return JSONResponse(
            content={
                "reply": result.reply,
                "canvas_update": result.canvas_update,
                "thinking": result.thinking,
                "max_turns_exceeded": result.max_turns_exceeded,
            }
        )
    except Exception as exc:
        print("[ai/chat] failed:", repr(exc))
        return _error_response(500, "ai_chat_failed", str(exc))


@app.get("/test-glb")
async def test_glb(request: Request) -> JSONResponse:
    task = run_test_export_task.delay()
    try:
        task_payload = await run_in_threadpool(task.get, timeout=EXPORT_TASK_TIMEOUT_SECONDS)
        payload = _normalize_task_payload(task_payload, request)
        return JSONResponse(content=payload)
    except CeleryTimeoutError:
        return _error_response(504, "test_export_timeout", "Timed out waiting for the test export task")
    except RuntimeError as exc:
        return _error_response(500, "test_export_failed", str(exc))


@app.post("/graphs/import-test")
async def import_test_graph(request: Request) -> JSONResponse:
    payload = await _read_json_body(request) or {}
    project_id = payload.get("projectId") if isinstance(payload, dict) else None
    if not isinstance(project_id, str) or not project_id:
        return _error_response(400, "invalid_project_id", "projectId must be a non-empty string")

    try:
        imported = await run_in_threadpool(build_test_import_payload, project_id, GENERATED_DIR)
        imported["glb_url"] = _generated_glb_url(request, imported["filename"])
        return JSONResponse(content=imported)
    except Exception as exc:
        return _error_response(500, "test_import_failed", str(exc))


@app.post("/graphs/import-ghx")
async def import_ghx_graph(request: Request) -> JSONResponse:
    filename = unquote(request.headers.get("x-filename", "imported.ghx"))
    if not filename.lower().endswith(".ghx"):
        return _error_response(400, "invalid_ghx_filename", "Only .ghx files are supported")

    content = await request.body()
    if not content:
        return _error_response(400, "empty_ghx", "The uploaded GHX file is empty")
    if len(content) > MAX_GHX_BYTES:
        return _error_response(413, "ghx_too_large", "The uploaded GHX file exceeds the 10 MB limit")

    graph_id = f"ghx-{uuid4()}"
    try:
        imported = await run_in_threadpool(
            build_ghx_import_payload,
            graph_id,
            content,
            filename,
            GENERATED_DIR,
        )
        imported["glb_url"] = _generated_glb_url(request, imported["filename"])
        return JSONResponse(content=imported)
    except GhxImportError as exc:
        return _error_response(400, "ghx_import_failed", str(exc))
    except Exception as exc:
        return _error_response(500, "ghx_import_failed", str(exc))


@app.post("/graphs/export")
async def export_graph(request: Request) -> JSONResponse:
    document = await _read_json_body(request)
    print("POST /graphs/export called")
    if document is None:
        print("Export request body was not valid JSON")
        return _error_response(400, "invalid_json", "Request body must be valid JSON")
    if not isinstance(document, dict):
        return _error_response(400, "invalid_document", "Request body must be a JSON object")

    task = export_graph_task.delay(document)
    try:
        payload = await run_in_threadpool(task.get, timeout=EXPORT_TASK_TIMEOUT_SECONDS)
        normalized = _normalize_task_payload(payload, request)
        return JSONResponse(content=normalized)
    except CeleryTimeoutError:
        return _error_response(504, "graph_export_timeout", "Timed out waiting for the graph export task")
    except ValueError as exc:
        errors = exc.args[0] if exc.args and isinstance(exc.args[0], list) else []
        print("Graph validation failed:", errors)
        return _error_response(400, "graph_validation_failed", "Graph validation failed", errors=errors)
    except RuntimeError as exc:
        print("Graph export failed with runtime error:", repr(exc))
        return _error_response(500, "graph_export_failed", str(exc))


@app.post("/graphs/export/jobs")
async def export_graph_job(request: Request) -> JSONResponse:
    document = await _read_json_body(request)
    if document is None:
        return _error_response(400, "invalid_json", "Request body must be valid JSON")
    if not isinstance(document, dict):
        return _error_response(400, "invalid_document", "Request body must be a JSON object")

    task = export_graph_task.delay(document)
    return JSONResponse(status_code=202, content={"taskId": task.id, "status": task.status})


@app.get("/tasks/{task_id}")
async def task_status(task_id: str, request: Request) -> JSONResponse:
    task = AsyncResult(task_id, app=celery_app)
    if task.state in {"PENDING", "RECEIVED", "STARTED", "RETRY"}:
        return JSONResponse(content={"taskId": task_id, "status": task.state.lower()})

    if task.state == "FAILURE":
        message = str(task.result) if task.result is not None else "Task failed"
        return JSONResponse(status_code=500, content={"taskId": task_id, "status": "failure", "message": message})

    try:
        payload = _normalize_task_payload(task.result, request)
        return JSONResponse(content={"taskId": task_id, "status": "success", "result": payload})
    except ValueError as exc:
        errors = exc.args[0] if exc.args and isinstance(exc.args[0], list) else []
        return JSONResponse(
            status_code=400,
            content={
                "taskId": task_id,
                "status": "validation_error",
                "errors": errors,
            },
        )
    except RuntimeError as exc:
        return JSONResponse(
            status_code=500,
            content={
                "taskId": task_id,
                "status": "failure",
                "message": str(exc),
            },
        )


@app.get("/generated/{filename:path}")
async def generated_file(filename: str) -> FileResponse:
    target_path = _resolve_generated_file(filename)
    return FileResponse(target_path, media_type="model/gltf-binary")
