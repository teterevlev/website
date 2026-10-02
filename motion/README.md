# Motion — motion.revlev.org

Одностраничник-портфолио анимаций.

## Структура

- `index.html` / `style.css` / `main.js` — лендинг
- `video/` — 2 MP4-тизера
- `demos/` — интерактивные демо (window-light, safe-stop, graded-stop)

## Локально

```bash
cd motion && python3 -m http.server 8080
# http://127.0.0.1:8080/
```

## Деплой

Cloudflare Pages project **`motion`**, root `motion/`, domain **`motion.revlev.org`**.
Push в `main` (изменения под `motion/`) триггерит деплой.
