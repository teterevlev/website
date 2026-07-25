# Правила вёрстки интерактивного макета

Правила извлечены из `index.html` и `background.js`. Соблюдать при доработке страницы и при переносе в другие экраны/проекты.

---

## 1. Структура страницы

- Страница — вертикальная лента полноэкранных секций (`.screen`), каждая высотой `100vh`.
- Контент экранов 1–3 закрепляется через `scroll-snap-type: y mandatory` + `.snap` (`scroll-snap-align: start`, `scroll-snap-stop: always`).
- Начиная с экрана 4 snap отключается (JS: `scrollSnapType = 'none'` после `screen-3`), чтобы форма и длинный контент скроллились свободно.
- `body` / `html`: `overflow: hidden`; скролл только у `.scroll-container`.
- `overscroll-behavior: none` — без «отскока» страницы.

## 2. Слои и фон

Порядок слоёв (снизу вверх):

1. `#bg-canvas` — WebGL-каустики на белом поле (`z-index: 0`, `pointer-events: none`)
2. `.grain-overlay` — лёгкий SVG-шум, opacity ≈ `0.022` (`z-index: 1`)
3. `.scroll-container` — контент (`z-index: 2`)
4. UI поверх контента (стрелка, fixed CTA) — `z-index` 90–200

- Экраны 1–3: фон секции **прозрачный** — виден шейдер.
- Экран 4: тёмный оверлей `rgba(0,0,0,0.8)`, светлый текст.
- Экран 5: сплошной белый фон, тёмный текст.
- Фон не должен конкурировать с текстом: каустики приглушённые, палитра near-white / pale blue.

## 3. Сетка контента

- Каждый экран: `.screen-content` — CSS Grid, `max-width: 1200px`, две колонки `1fr 1fr`, gap `2rem 4rem`.
- **Блок A** (`.block-a`) — текст, медиа-плейсхолдеры, формы.
- **Блок B** (`.block-b`) — правая колонка (часто пустая на экранах 1–3; на 4–5 — доп. текст/CTA).
- Группа главных кнопок `.btn-group.main-actions` вынесена из колонки A на `grid-column: 1 / -1`, чтобы не раздувать левую колонку.

## 4. Типографика

| Роль | Шрифт | Размер (desktop) |
|------|--------|------------------|
| Заголовки `h1`/`h2` | Russo One (`--font-display`) | `clamp` по `vw` |
| Текст, UI | Inter (`--font`) | `p`: `1.125rem`, line-height `1.6` |

- Заголовки: `font-weight: 400`, `line-height: 1.15`, `letter-spacing: -0.02em`.
- Цвет текста по умолчанию: `--ink` (`#1f3a52`).
- Antialiasing включён глобально (`-webkit-font-smoothing: antialiased`).

## 5. Цветовые токены

Использовать переменные из `:root`, не хардкодить новые оттенки без нужды:

- Нейтрали: `--white`, `--snow`, `--ash`, `--mist`, `--smoke`, `--slate`, `--ink`
- Акцент синий: `--blue-pale` → `--blue-ink`
- CTA primary: жёлтый `#ffff7b` / hover `#fdfd5f` на `--ink`
- Secondary: `#2c5c85` / hover `#1f4363`
- Dark button (форма): `--ink` / hover `#000`

## 6. Кнопки

- Класс `.btn`: pill (`border-radius: 100px`), `inline-flex`, `white-space: nowrap`, transition `0.2s`.
- Варианты: `.btn-primary`, `.btn-secondary`, `.btn-dark`.
- Primary/dark на hover: лёгкий подъём `translateY(-2px)` и усиление тени.
- Группа: `.btn-group` — flex, `gap: 1rem`, без переноса на desktop (`flex-wrap: nowrap`).

### Sticky CTA (desktop)

- Реальные кнопки `#btn-voice` / `#btn-cta` позиционируются абсолютно/фиксированно поверх невидимых spacer-кнопок.
- Spacer-кнопки держат место в потоке (`visibility: hidden`).
- «Голосовое управление» фиксируется между экранами 1→2; CTA — между 1→3.
- На `≤900px` JS-позиционирование **выключено**: стили снимаются, управляет CSS.

## 7. Медиа-плейсхолдер

- `.block-16x9`: строго `aspect-ratio: 16 / 9`.
- Desktop: `max-width: 380px`, лёгкий glass (`backdrop-filter`, полупрозрачный фон, тонкая рамка, `border-radius: 12px`).

## 8. Формы

- `.form-container`: колонка, `max-width: 420px`, `gap: 1rem`.
- Поля: фон `--snow`, бордер `--smoke`, радиус `8px`; focus → `--blue`.
- Шрифт полей наследует body.

## 9. Навигация «вниз»

- `.scroll-down` — fixed по центру снизу, bounce-анимация, `pointer-events: none`.
- Скрывается при `scrollTop > 50` (opacity) и полностью на мобиле (`display: none`).

## 10. Адаптив: breakpoint и ориентации

**Breakpoint:** `max-width: 900px`.

Общее для mobile:

- Скрыть `.scroll-down` и все `.btn-secondary`.
- Скрыть `#btn-voice` и spacer-элементы.
- `#btn-cta` — fixed поверх контента (`z-index: 200`).

### Portrait

- Сетка: одна колонка, две строки `1fr 1fr` (строго 50% / 50% высоты).
- **Блок B сверху** (`order: -1`), блок A снизу.
- Шрифты и отступы масштабировать через `vh` (`clamp(..., vh, ...)`), чтобы текст помещался в свою половину.
- `.block-16x9`: высота `max(22vh, 80px)`, ширина из `aspect-ratio`, `align-self: flex-start`, `flex-shrink: 0`.
- CTA: по центру снизу экрана.

### Landscape

- Сетка остаётся `1fr 1fr` (50/50 по ширине).
- Компактные шрифты и padding.
- `.block-16x9`: `width: min(100%, calc(32vh * 16 / 9))`.
- CTA: правая половина, `right: 1.5rem`, ширина `calc(50% - 3rem)` — не прыгает при смене контента.

## 11. Язык и доступность базы

- `lang="ru"`, viewport `width=device-width, initial-scale=1.0`.
- Семантика: `<section>` на экраны, заголовки `h1` (первый экран) / `h2` (остальные).
- Preconnect к Google Fonts перед подключением гарнитур.

## 12. Чего не делать

- Не ставить `overflow` на `body` обратно в `auto` — сломается модель скролла.
- Не возвращать secondary-кнопки на mobile без пересмотра layout.
- Не задавать одновременно конкурирующие `width`/`max-width`/`max-height` у `.block-16x9` на portrait — высота через `vh`, ширина из ratio.
- Не оставлять инлайн `position/top/left` на CTA после перехода в mobile (сбрасывать через `removeProperty`).
- Не усиливать фон (grain/caustics) так, чтобы ухудшалась читаемость `--ink` на белом.
