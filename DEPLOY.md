# Деплой

## Cloudflare Pages (`main` → `.org`)

| Путь в репо | Хост(ы) |
|-------------|---------|
| `revlev.ru/` | `revlev.org` |
| `maket/` | `model.revlev.org` (canonical). Хост `maket.revlev.org` → **301** на model (см. ниже). Intro: `maket/intro/` + `maket/img/intro/` — см. `maket/INTRO.md` |
| `pcb/` | `pcb.revlev.org` |
| `research/` | `research.revlev.org` (Cloudflare Pages, Hugo; см. `research/README.md`) |
| `feedback/` | Cloudflare Worker → Telegram |

### 301: `maket.revlev.org` → `model.revlev.org` (не удалять)

Канонический хост макета — **`model.revlev.org`**. Старый **`maket.revlev.org`** должен всегда отдавать **301** на тот же путь на model.

| Что | Значение |
|-----|----------|
| Где | Cloudflare Dashboard → **Rules** → **Redirect Rules** |
| Фаза | `http_request_dynamic_redirect` |
| From | `https://maket.revlev.org/*` |
| To | `https://model.revlev.org/$1` |
| Status | **301** |

Canonical / `og:url` / sitemap в `maket/` указывают на **model.revlev.org**. Правило редиректа — в Cloudflare (не в репо); при чистке DNS/Workers/доменов **не снимать**.

### Research (Hugo → Pages)

Pages project: **`research`** (`research-9u6.pages.dev`). Domain: **`research.revlev.org`** (CNAME → pages.dev).

Build settings (уже в проекте):

| Setting | Value |
|---------|-------|
| Root directory | `research` |
| Build command | `hugo --minify -b https://research.revlev.org/` |
| Build output directory | `public` |
| Production branch | `main` |
| Env `HUGO_VERSION` | `0.166.0` (Production + Preview; нужен ≥0.156 из‑за `hugo.Data`) |

Осталось один раз: Dashboard → project `research` → **Connect to Git** → `teterevlev/website`, затем push папки `research/` в `main` (или Upload assets из `research/public/`).

Локально: `cd research && hugo server -D` — гайд: `research/README.md`.

## VPS (`ru` → `.ru`)

Статика раздаётся nginx’ом из папок репозитория. Форма → FastAPI (файл + forward на Worker → Telegram).

| Путь в репо | Назначение |
|-------------|------------|
| `revlev.ru/` | основной сайт `revlev.ru` |
| `maket/` | поддомен `maket.revlev.ru` |
| `pcb/` | поддомен `pcb.revlev.ru` |
| `feedback-vps/` | приём формы: jsonl + best-effort Worker |
| `feedback/` | Cloudflare Worker → Telegram |

## Статика (nginx, ветка `ru`)

Пример корней:

```nginx
server {
    server_name revlev.ru www.revlev.ru;
    root /var/www/revlev.ru/revlev.ru;
    index index.html;
}

server {
    server_name maket.revlev.ru;
    root /var/www/revlev.ru/maket;
    index index.html;

    location = /api/feedback {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name pcb.revlev.ru;
    root /var/www/revlev.ru/pcb;
    index index.html;
}
```

Обновление сайта: `git pull` в каталоге деплоя (или rsync).

## Feedback (FastAPI)

См. `feedback-vps/README.md`: venv, `.env`, юнит `revlev-feedback.service`.
