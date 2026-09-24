# Статический сайт (папка `revlev.ru/`)

На ветке **`main`** эта папка деплоится на Cloudflare Pages как **revlev.org**.
На ветке **`ru`** — на VPS как **revlev.ru** (см. `../DEPLOY.md`).

Код — обычные HTML/CSS/JS.

Форма на лендинге макета ходит в Worker `../feedback/` (или на VPS — в `../feedback-vps/`).
