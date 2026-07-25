# Правила вёрстки интерактивного макета

Правила извлечены из `index.html`, `background.js` и `building-scene.js`. Соблюдать при доработке страницы и при переносе в другие экраны/проекты.

---

## 1. Структура страницы

- Страница — вертикальная лента полноэкранных секций (`.screen`), каждая высотой `100vh`.
- Контент экранов 1–3 закрепляется через `scroll-snap-type: y mandatory` + `.snap` (`scroll-snap-align: start`, `scroll-snap-stop: always`).
- Начиная с экрана 4 snap отключается (JS: `scrollSnapType = 'none'` после `screen-3`), чтобы форма и длинный контент скроллились свободно.
- `body` / `html`: `overflow: hidden`; скролл только у `.scroll-container` (`overflow-x: hidden`).
- `overscroll-behavior: none` — без «отскока» страницы.

## 2. Слои и фон

Порядок слоёв (снизу вверх):

1. `#bg-canvas` — WebGL-каустики на белом поле (`z-index: 0`, `pointer-events: none`)
2. `.grain-overlay` — лёгкий SVG-шум, opacity ≈ `0.022`
3. `#sceneLayer` — Three.js сцена дома (`building-scene.js`), между фоном и текстом
4. `#pcbOverlay` — fixed `pcb.png` (`z-index: 1`, `pointer-events: none`)
5. `.scroll-container` — контент (`z-index: 2`)
6. UI поверх контента (стрелка, fixed CTA) — `z-index` 90–200

- Экраны 1–3: фон секции **прозрачный** — видны шейдер и 3D.
- Экран 4: тёмный оверлей `rgba(0,0,0,0.8)`, светлый текст.
- Экран 5: сплошной белый фон, тёмный текст; на mobile без жёсткой высоты экрана.
- Фон не должен конкурировать с текстом: каустики приглушённые, палитра near-white / pale blue.
- Exit 3D после screen 3 → screen 4 (`worldRig` вниз). Орбита без зума; rotate только с «пустых» зон; колесо скроллит страницу.

## 3. Сетка контента

- Каждый экран: `.screen-content` — CSS Grid, `max-width: 1200px`, две колонки `1fr 1fr`, gap `2rem 4rem`.
- **Блок A** (`.block-a`) — текст, медиа, формы.
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
- Hover (подъём / тень) **только** в `@media (hover: hover) and (pointer: fine)` — без «залипания» на таче.
- Группа: `.btn-group` — flex, `gap: 1rem`, без переноса на desktop (`flex-wrap: nowrap`).

### Sticky CTA

- Реальные кнопки `#btn-voice` / `#btn-cta` позиционируются абсолютно/фиксированно поверх невидимых spacer-кнопок.
- Spacer-кнопки держат место в потоке (`visibility: hidden`).
- «Голосовое управление» фиксируется между экранами 1→2.
- CTA стыкуется к `#spacer-cta-dock` на **screen 4** (не к screen 3); после стыковки — `position: absolute`, без пересчёта каждый кадр.
- На mobile: та же схема; secondary скрываются **только на screen 1–3** (на 4–5 остаются).
- Якорь для fixed CTA: если `offsetParent === null`, брать `.screen-1 .btn-group.main-actions`.

## 7. Медиа и декоративные слои

### `.block-16x9` / таблица / браузеры

- `.block-16x9`: строго `aspect-ratio: 16 / 9`.
- Desktop: `max-width: 380px`; glass-плейсхолдер или chrome-браузер.
- **Screen 1:** auto-demo при exact snap: волны `PCB → block-b` + цикл случайных front-окон (каждые 2с; свет после прилёта волны).
- **Screen 2:** `.flatsTableWrap` + таблица; nested scroll у `.browserContent`. Cursor-demo кликает строки 0/1 (dismiss по клику/тачу/скроллу таблицы). Клик → волны `row → PCB → block-b` + окна. Gate: exact `scrollTop ≈ screen-2.offsetTop`.
- **Screen 3:** `.block-16x9.flatsTableWrap` — браузер с flat pages (9/14), без внутреннего скролла. Демо-loop только при exact snap: typewriter → волны `mic → PCB → block-b` → страница + окна.
- Все волны заканчиваются в центре `.block-b` текущего экрана.
- Mic **не** летает из центра браузера: остаётся в слотах ниже; caption typewriter рядом с видимым mic.

### PCB (`#pcbOverlay`)

- Fixed; `pointer-events: none`; уезжает вниз после screen 3.
- Тюнинг exit в JS: `PCB_EXIT_SPEED`, `PCB_EXIT_DISTANCE`, `PCB_EXIT_ACCEL`.
- **Portrait:** слева над блоком A, ширина `25vw`.
- **Desktop / landscape:** левый низ колонки B (~78% высоты колонки), ширина ≈ `30%` ширины колонки.
- Waypoint для `#signalWavesLayer` (не дублировать exit в демо).

### Mic (`mic.png`)

- **Desktop / landscape:** в `.media-row` справа от `.block-16x9`; высота = высота блока (JS синхронизирует); caption `.mic-caption--inline`.
- **Portrait:** не fixed; только на screen 3 как `.mic-portrait` внутри `.block-b`:
  - `position: absolute` относительно `block-b` (`position: relative`);
  - `left: 12px`, `width: 25vw` (как PCB);
  - `aspect-ratio: 409 / 610` (натуральный размер файла);
  - в **нижней части** `block-b`: `bottom: calc(25vw * 610 / 409 / 2)` — отступ снизу = **половина фактической высоты** mic;
  - `pointer-events: none`;
  - caption `.mic-caption--portrait`.
- `#micOverlay` не используется (`display: none`).
- Не переносить absolute mic-fly / `is-settled` из building-3d hero3.

### WebGL окна (`building-scene.js`)

- API из `BuildingScene.init`: `lightWindowByNumber`, `turnOffAllWindows`, `lightFlatWindows(nums)`.
- Номера окон 1-based, совместимы с `data-flat-windows` / flats 9→`[13,14,61]`, 14→`[20,21,22]`.

## 8. Формы

- `.form-container`: колонка, `max-width: 420px`, `gap: 1rem`.
- Поля: фон `--snow`, бордер `--smoke`, радиус `8px`; focus → `--blue`.
- Шрифт полей наследует body.
- Screen 5 на mobile: компактная форма, без лишнего `padding-top` у `block-b`.

## 9. Навигация «вниз»

- `.scroll-down` — fixed по центру снизу, bounce-анимация, `pointer-events: none`.
- Скрывается при `scrollTop > 50` (opacity) и полностью на мобиле (`display: none`).

## 10. Адаптив: breakpoint и ориентации

**Breakpoint:** `max-width: 900px` (для 3D top-framing тот же порог + portrait).

**Landscape compact** также при `(orientation: landscape) and (max-height: 500px)` — ловит широкие телефоны (напр. 932×430), где `width > 900`.

Общее для mobile:

- Скрыть `.scroll-down`.
- Скрыть `.btn-secondary` только на screen 1–3.
- Sticky CTA по схеме выше.

### Portrait (`max-width: 900px` + portrait)

- Сетка: одна колонка, две строки `1fr 1fr` (строго 50% / 50% высоты).
- **Screen 1–3:** блок B сверху (`order: -1`, `justify-content: flex-end`), блок A снизу.
- **Screen 4–5:** наоборот — A сверху, B снизу.
- **Screen 4:** кнопки отдельно (`display: contents` + `order`): CTA сверху, кнопки из A снизу.
- Шрифты и отступы масштабировать через `vh` (`clamp(..., vh, ...)`), чтобы текст помещался в свою половину.
- `.block-16x9`: высота `max(22vh, 80px)`, ширина из `aspect-ratio`, `align-self: flex-start`, `flex-shrink: 0`.
- Mic portrait — см. §7.

### Landscape

- Сетка остаётся `1fr 1fr` (50/50 по ширине).
- Компактные шрифты и padding.
- `.block-16x9`: `width: min(100%, calc(32vh * 16 / 9))` — высота от `vh`, не от ширины колонки.
- CTA: правая половина / «полочка» справа — не прыгает при смене контента.

## 11. Язык и доступность базы

- `lang="ru"`, viewport `width=device-width, initial-scale=1.0`.
- Семантика: `<section>` на экраны, заголовки `h1` (первый экран) / `h2` (остальные).
- Preconnect к Google Fonts перед подключением гарнитур.

## 12. Чего не делать

- Не ставить `overflow` на `body` обратно в `auto` — сломается модель скролла.
- Не возвращать secondary на mobile screen 1–3 без пересмотра layout; на 4–5 они должны оставаться.
- Не задавать одновременно конкурирующие `width`/`max-width`/`max-height` у `.block-16x9` на portrait — высота через `vh`, ширина из ratio.
- Не позиционировать portrait-mic через `bottom: 50% + …` (середина экрана) — только низ `block-b` с отступом = ½ высоты mic.
- Не копировать mic-fly / `getNearestHeroIndex` из building-3d — демо screen 3 только при точном snap на screen 3.
- Не оставлять инлайн `position/top/left` на CTA после перехода в mobile (сбрасывать через `removeProperty`).
- Не читать `offsetTop` каждый кадр для exit 3D/PCB — кэшировать границы.
- Не усиливать фон (grain/caustics) так, чтобы ухудшалась читаемость `--ink` на белом.
