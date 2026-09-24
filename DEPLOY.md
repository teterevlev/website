# Деплой

## Cloudflare Pages (`main` → `.org`)

| Путь в репо | Хост(ы) |
|-------------|---------|
| `revlev.ru/` | `revlev.org` |
| `maket/` | `model.revlev.org`, `maket.revlev.org` (canonical → model; 301 между хостами — Redirect Rules в Cloudflare) |
| `pcb/` | `pcb.revlev.org` |
| `feedback/` | Cloudflare Worker → Telegram |

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
