# API

Minimal Flask backend for `pyhopper-web`.

## Install

```bash
pip install -r requirements.txt
```

This installs the local `pyhopper` repo in editable mode via `-e ../..`, so code under `pyhopper/` is importable directly from the API.

## Run

```bash
python app.py
```

Health check:

```bash
curl http://127.0.0.1:5000/health
```
