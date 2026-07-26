# Статический сайт revlev.ru (Cloudflare Workers Assets)

Код — обычные HTML/CSS/JS. **Worker-логики нет.**  
`wrangler` в билде всё равно нужен Cloudflare’у: это просто CLI, который заливает папку на edge. Без `wrangler.toml` команда `npx wrangler versions upload` падает с *Missing entry-point*.

## Настройки в Dashboard (Worker этого сайта)

| Поле | Значение |
|------|----------|
| **Project name** | `revlev-ru` (как `name` в `wrangler.toml`) |
| **Path** | `revlev.ru` |
| **Build command** | пусто |
| **Deploy command** | `npx wrangler deploy` |
| Non-production deploy (если включено) | `npx wrangler versions upload` — ок, конфиг тот же |
| **API token / Variables** | пусто |

Секреты Telegram сюда не ставить — они у Worker’а `revlev-feedback`.

## После пуша

Должен задеплоиться сайт с `index.html`, `css/`, `js/`, `img/`.  
Если билд пишет, что имя не совпадает — выровняйте **Project name** в Dashboard и `name` в `wrangler.toml`.
