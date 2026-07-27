"""
FastAPI: форма → файл, ответ клиенту, затем best-effort forward на Worker.

Env:
  ALLOW_ORIGINS     — CSV разрешённых Origin (CORS)
  FEEDBACK_LOG      — путь к jsonl-логу (по умолчанию data/feedback.jsonl)
  FORWARD_URL       — URL Worker’а; пусто = не форвардить
  FORWARD_MAX_TIME  — таймаут HTTP к Worker в секундах (по умолчанию 5)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import BackgroundTasks, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger("feedback")

MAX_NAME = 200
MAX_CONTACT = 200
MAX_MESSAGE = 2000

DEFAULT_ORIGINS = [
    "https://maket.revlev.ru",
    "https://revlev.ru",
]
DEFAULT_FORWARD = "https://revlev-feedback.oteterevlev.workers.dev/"
DEFAULT_LOG = "data/feedback.jsonl"
DEFAULT_FORWARD_MAX_TIME = 5.0

app = FastAPI(title="revlev-feedback", docs_url=None, redoc_url=None)


def parse_allow_list(raw: str | None) -> list[str]:
    return [s.strip() for s in str(raw or "").split(",") if s.strip()]


def allow_origins() -> list[str]:
    listed = parse_allow_list(os.environ.get("ALLOW_ORIGINS", ""))
    return listed or DEFAULT_ORIGINS


def is_origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    listed = allow_origins()
    return origin in listed or "*" in listed


def clean(value: Any, max_len: int) -> str:
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").strip()[:max_len]


def log_path() -> Path:
    return Path(os.environ.get("FEEDBACK_LOG", DEFAULT_LOG)).expanduser()


def forward_url() -> str | None:
    raw = os.environ.get("FORWARD_URL", DEFAULT_FORWARD).strip()
    return raw or None


def forward_max_time() -> float:
    raw = os.environ.get("FORWARD_MAX_TIME", "").strip()
    if not raw:
        return DEFAULT_FORWARD_MAX_TIME
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_FORWARD_MAX_TIME
    return value if value > 0 else DEFAULT_FORWARD_MAX_TIME


def forward_timeout() -> httpx.Timeout:
    seconds = forward_max_time()
    return httpx.Timeout(seconds)


def json_err(error: str, status: int) -> JSONResponse:
    return JSONResponse({"ok": False, "error": error}, status_code=status)


# CORS читается при старте процесса; смена ALLOW_ORIGINS → restart сервиса.
_origins = allow_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if "*" not in _origins else ["*"],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["content-type"],
    max_age=86400,
)


def append_log(entry: dict[str, Any]) -> None:
    path = log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(entry, ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)


async def forward_to_worker(
    payload: dict[str, str],
    origin: str,
) -> None:
    url = forward_url()
    if not url:
        return

    # Worker проверяет Origin — передаём исходный (или maket).
    fwd_origin = origin if is_origin_allowed(origin) else "https://maket.revlev.ru"
    try:
        async with httpx.AsyncClient(timeout=forward_timeout()) as client:
            res = await client.post(
                url,
                json=payload,
                headers={
                    "content-type": "application/json",
                    "origin": fwd_origin,
                },
            )
        if res.status_code >= 400:
            logger.warning(
                "forward_failed status=%s body=%s",
                res.status_code,
                res.text[:300],
            )
        else:
            logger.info("forward_ok status=%s", res.status_code)
    except Exception as exc:
        # Worker недоступен — заявка уже в файле, клиенту уже отдали ok.
        logger.warning("forward_unavailable %s", exc)


async def handle_feedback(
    name: Any,
    contact: Any,
    message: Any,
    background_tasks: BackgroundTasks,
    origin: str = "",
) -> Response:
    name_s = clean(name, MAX_NAME)
    contact_s = clean(contact, MAX_CONTACT)
    message_s = clean(message, MAX_MESSAGE)

    if not name_s or not contact_s:
        return json_err("required_fields", 400)

    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "name": name_s,
        "contact": contact_s,
        "message": message_s,
        "origin": origin or None,
    }

    try:
        await asyncio.to_thread(append_log, entry)
    except OSError as exc:
        logger.error("log_write_failed %s", exc)
        return json_err("log_failed", 500)

    payload = {"name": name_s, "contact": contact_s, "message": message_s}
    # После ответа клиенту — best-effort forward.
    background_tasks.add_task(forward_to_worker, payload, origin)

    return JSONResponse({"ok": True})


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/")
async def feedback(
    request: Request,
    background_tasks: BackgroundTasks,
) -> Response:
    origin = request.headers.get("origin") or ""
    if not is_origin_allowed(origin):
        return json_err("origin_not_allowed", 403)

    content_type = (request.headers.get("content-type") or "").lower()

    try:
        if "application/json" in content_type:
            body = await request.json()
            if not isinstance(body, dict):
                return json_err("invalid_body", 400)
            return await handle_feedback(
                body.get("name"),
                body.get("contact"),
                body.get("message"),
                background_tasks,
                origin=origin,
            )

        if (
            "application/x-www-form-urlencoded" in content_type
            or "multipart/form-data" in content_type
        ):
            form = await request.form()
            return await handle_feedback(
                form.get("name"),
                form.get("contact"),
                form.get("message"),
                background_tasks,
                origin=origin,
            )
    except Exception:
        return json_err("invalid_body", 400)

    return json_err("invalid_body", 400)
