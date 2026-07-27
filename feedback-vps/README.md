# feedback-vps — FastAPI → Telegram

Аналог Cloudflare Worker из `../feedback/` для запуска на своём VPS.

Форма на `maket.revlev.ru` шлёт `POST` (JSON) на endpoint за nginx.

## API

| Метод | Путь | Тело |
|-------|------|------|
| `POST` | `/` | JSON или form-data: `name`, `contact`, `message` |
| `GET` | `/health` | — |

Ответ как у Worker: `{ "ok": true }` или `{ "ok": false, "error": "…" }`.

## Локально

```bash
cd feedback-vps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # заполнить токен и user id
set -a && source .env && set +a
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Проверка:

```bash
curl -i -X POST 'http://127.0.0.1:8001/' \
  -H 'content-type: application/json' \
  -H 'origin: https://maket.revlev.ru' \
  -d '{"name":"Test","contact":"+7…","message":"hello"}'
```

## VPS (systemd)

1. Скопировать папку, например в `/opt/revlev/feedback-vps`.
2. Создать venv и поставить зависимости (как выше).
3. `cp .env.example .env` и заполнить секреты (`chmod 600 .env`).
4. Юнит:

```bash
sudo cp revlev-feedback.service /etc/systemd/system/
# при необходимости поправьте User/paths в юните
sudo systemctl daemon-reload
sudo systemctl enable --now revlev-feedback
sudo systemctl status revlev-feedback
```

## nginx

Проксировать путь формы на uvicorn:

```nginx
location = /api/feedback {
    proxy_pass http://127.0.0.1:8001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Тогда в форме: `action="https://maket.revlev.ru/api/feedback"`.

## Env

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | токен от @BotFather |
| `TELEGRAM_USER_ID` | числовой chat / user id |
| `ALLOW_ORIGINS` | CSV Origin для CORS |

Cloudflare Worker (`../feedback/`) оставлен на будущее — тот же контракт API.
