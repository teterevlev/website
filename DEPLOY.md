# Деплой на Cloudflare (монорепо)

В репозитории несколько независимых проектов. У **каждого** Worker в Dashboard свой **Path**.

| Worker (Project name) | Path | Что это |
|----------------------|------|---------|
| `revlev-ru` | `revlev.ru` | основной сайт |
| `maket` | `maket` | поддомен макета |
| `pcb` | `pcb` | поддомен PCB |
| `revlev-feedback` | `feedback` | форма → Telegram |

Везде: **Build** пусто, **Deploy** = `npx wrangler deploy`.

## Ветки `cloudflare/workers-autoconfig*`

Их создаёт бот Cloudflare, когда в Path нет конфига. **Не мержить** эти PR:

- часто крутятся с неверным Path (корень репо) → `Missing entry-point`
- подставляют чужие `name` (например pcb → `revlev-ru`) и ломают другие Worker’ы

Закройте PR и удалите ветки в GitHub. Конфиги уже лежат в папках на `main` (`wrangler.toml`).

Если билд снова упадёт на autoconfig-ветке — это не прод; смотрите только билды с `main`.
