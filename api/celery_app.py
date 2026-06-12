from __future__ import annotations

import os

from celery import Celery


REDIS_URL = os.getenv("PYHOPPER_REDIS_URL", "redis://127.0.0.1:6379/0")
BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)


celery_app = Celery("pyhopper_web", broker=BROKER_URL, backend=RESULT_BACKEND)
celery_app.conf.update(
    imports=("tasks",),
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
    task_track_started=True,
    task_ignore_result=False,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1,
    timezone="UTC",
)