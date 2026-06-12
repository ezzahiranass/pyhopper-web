# API

FastAPI backend for `pyhopper-web`, with Celery workers backed by Redis for graph export jobs.

## Install

```bash
pip install -r requirements.txt
```

This installs the local `pyhopper` repo in editable mode via `-e ../..`, so code under `pyhopper/` is importable directly from the API.

## Run

```bash
docker rm -f pyhopper-redis
docker run --name pyhopper-redis -p 6379:6379 -d redis:7-alpine
conda activate <your-conda-env>
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, start the worker:

```bash
conda activate <your-conda-env>
celery -A celery_app.celery_app worker --loglevel=info --pool=solo
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```
