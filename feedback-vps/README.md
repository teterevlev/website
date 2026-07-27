# feedback-vps — FastAPI: файл + Cloudflare Worker

Форма на `maket.revlev.ru` → этот сервис: сначала запись в jsonl, сразу ответ клиенту, затем в фоне best-effort `POST` на Worker (`../feedback/` → Telegram).

Если Worker недоступен или таймаут — клиенту уже отдали `{ "ok": true }` (заявка в файле).

## API

| Метод | Путь | Тело |
|-------|------|------|
| `POST` | `/` | JSON или form-data: `name`, `contact`, `message` |
| `GET` | `/health` | — |

## Локально

```bash
cd feedback-vps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
set -a && source .env && set +a
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

```bash
curl -i -X POST 'http://127.0.0.1:8001/' \
  -H 'content-type: application/json' \
  -H 'origin: https://maket.revlev.ru' \
  -d '{"name":"Test","contact":"+7…","message":"hello"}'

tail -n 1 data/feedback.jsonl
```

## VPS (systemd)

Пути: `/opt/revlev/feedback-vps`, пользователь `www-data`.

### 1. Код

```bash
sudo mkdir -p /opt/revlev
sudo cp -a /var/www/revlev.ru/feedback-vps /opt/revlev/feedback-vps
# или rsync с ноутбука — см. историю / DEPLOY.md
```

### 2. venv

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip

cd /opt/revlev/feedback-vps
sudo python3 -m venv .venv
sudo /opt/revlev/feedback-vps/.venv/bin/pip install --upgrade pip
sudo /opt/revlev/feedback-vps/.venv/bin/pip install -r requirements.txt
```

### 3. `.env`

```bash
cd /opt/revlev/feedback-vps
sudo cp .env.example .env
sudo nano .env
```

```env
ALLOW_ORIGINS=https://maket.revlev.ru,https://revlev.ru
FEEDBACK_LOG=data/feedback.jsonl
FORWARD_URL=https://revlev-feedback.oteterevlev.workers.dev/
FORWARD_MAX_TIME=5
```

`FORWARD_URL=` (пусто) — только файл, без форварда.  
`FORWARD_MAX_TIME` — таймаут HTTP к Worker (секунды, по умолчанию `5`).

```bash
sudo mkdir -p /opt/revlev/feedback-vps/data
sudo chown -R www-data:www-data /opt/revlev/feedback-vps
sudo chown root:root /opt/revlev/feedback-vps/.env
sudo chmod 600 /opt/revlev/feedback-vps/.env
```

### 4. systemd

```bash
sudo cp /opt/revlev/feedback-vps/revlev-feedback.service /etc/systemd/system/revlev-feedback.service
sudo systemctl daemon-reload
sudo systemctl enable --now revlev-feedback
sudo systemctl status revlev-feedback --no-pager
sudo journalctl -u revlev-feedback -f
```

После смены кода/`.env`:

```bash
sudo systemctl restart revlev-feedback
```

### 5. Проверка

```bash
curl -i --max-time 3 http://127.0.0.1:8001/health

curl -i --max-time 20 -X POST 'http://127.0.0.1:8001/' \
  -H 'content-type: application/json' \
  -H 'origin: https://maket.revlev.ru' \
  -d '{"name":"Test","contact":"+7…","message":"hello"}'

sudo tail -n 3 /opt/revlev/feedback-vps/data/feedback.jsonl
```

## nginx

```nginx
location = /api/feedback {
    proxy_pass http://127.0.0.1:8001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Форма: `action="https://maket.revlev.ru/api/feedback"`.

## Env

| Переменная | Описание |
|------------|----------|
| `ALLOW_ORIGINS` | CSV Origin для CORS |
| `FEEDBACK_LOG` | путь к jsonl (относительно WorkingDirectory) |
| `FORWARD_URL` | Worker; пусто = не форвардить |
| `FORWARD_MAX_TIME` | таймаут forward в секундах (по умолчанию `5`) |
