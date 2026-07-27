"""
FastAPI: форма → Telegram Bot API

Env:
  TELEGRAM_BOT_TOKEN — токен бота от @BotFather
  TELEGRAM_USER_ID   — числовой chat_id / user id получателя
  ALLOW_ORIGINS      — CSV разрешённых Origin (CORS)
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger("feedback")

MAX_NAME = 200
MAX_CONTACT = 200
MAX_MESSAGE = 2000

DEFAULT_ORIGINS = [
    "https://maket.revlev.ru",
    "https://revlev.ru",
]

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


def telegram_config() -> tuple[str, str]:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    user_id = os.environ.get("TELEGRAM_USER_ID", "").strip()
    return token, user_id


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


async def handle_feedback(name: Any, contact: Any, message: Any) -> Response:
    token, user_id = telegram_config()
    if not token or not user_id:
        return json_err("server_misconfigured", 500)

    name_s = clean(name, MAX_NAME)
    contact_s = clean(contact, MAX_CONTACT)
    message_s = clean(message, MAX_MESSAGE)

    if not name_s or not contact_s:
        return json_err("required_fields", 400)

    text = "\n".join(
        [
            "📩 Новая заявка с maket.revlev.ru",
            "",
            f"👤 Имя / компания: {name_s}",
            f"📞 Контакт: {contact_s}",
            f"💬 Задача:\n{message_s}" if message_s else "💬 Задача: —",
        ]
    )

    tg_url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            tg_res = await client.post(
                tg_url,
                json={
                    "chat_id": user_id,
                    "text": text,
                    "disable_web_page_preview": True,
                },
            )
    except httpx.HTTPError as exc:
        logger.error("telegram_request_error %s", exc)
        return json_err("telegram_failed", 502)

    if tg_res.status_code >= 400:
        logger.error(
            "telegram_error %s %s",
            tg_res.status_code,
            tg_res.text[:500],
        )
        return json_err("telegram_failed", 502)

    return JSONResponse({"ok": True})


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/")
async def feedback(request: Request) -> Response:
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
            )
    except Exception:
        return json_err("invalid_body", 400)

    return json_err("invalid_body", 400)
