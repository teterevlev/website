# Правила вёрстки интерактивного макета

Правила извлечены из `maket/index.html`, `scroll.html`, `revlev.ru/css/maket.css`, `background.js` и `building-scene.js`. Соблюдать при доработке страницы и при переносе в другие экраны/проекты.

Стили макета живут в `revlev.ru/css/maket.css` (деплой **revlev.ru**); HTML — в `maket/` (деплой **maket**). Cache-bust: `?v=` из `window.MAKET_DEPLOY` в `maket/index.html`.

**Заготовка скролла без WebGL:** `scroll.html` — один файл (HTML+CSS+JS), 5 экранов, тот же движок свайпа. Копировать как основу для похожих лендингов; продуктовые слои (3D, PCB, формы, sticky CTA) брать из `index.html` / §2–§12 ниже.

---

## 0. Движок скролла / свайпа (desktop + mobile)

Общая модель (и в `scroll.html`, и в `index.html`):

### Структура

- `.scroll-container` — единственный scrollport (`overflow-y: auto`); `html`/`body` — `overflow: hidden`, `overscroll-behavior: none`.
- Экраны 1–3: класс `.snap` (`scroll-snap-align: start`, `scroll-snap-stop: always`).
- Экраны 4–5: без `.snap`; свободный скролл. Screen 5: `height: auto`, `min-height: 100svh` на mobile.
- CSS `scroll-snap-type: y mandatory` на контейнере; JS выключает snap в зоне после screen 3 (см. slack).

### Константы (подгонять в одном месте)

| Константа | Смысл | Типично |
|-----------|--------|---------|
| `SCROLL_SWIPE_MS` | Длительность программного свайпа на 1 экран | `700` |
| `SCREEN4_PEEK_DURATION_RATIO` | Недосвайп 3→peek = доля от `SCROLL_SWIPE_MS` | `0.75` |
| `SCREEN_SWIPE_GESTURE_GAP_MS` | Пауза без wheel = конец жеста | `160` |
| `SWIPE_SPEEDUP_RATIO` / `SWIPE_SPEEDUP_EPS` | Рост \|delta\| → новый жест | `1.08` / `4` |
| `SCREEN3_UP_FREE_SLACK` | Доля viewport выше screen 3 ещё нативным скроллом вверх | `0.2` |

Peek: `scrollTop = screen4.offsetTop - 0.8 * clientHeight` (видно ~20% screen 4).

### Desktop (не compact)

- Snap-экраны 1–3: wheel перехватывается; анимация `easeInOutCubic` через rAF (`scroll-behavior: auto` на время анимации).
- **Новый жест:** разгон (`spedUp`), смена направления, щелчок мыши (`deltaMode === 1`), длинная пауза; короткая пауза + \|delta\| ≤ peak = хвост инерции.
- Peak = \|delta\| за событие (не `/dt`); при затухании peak остывает (`* 0.9`), иначе второй флик никогда не превысит пик.
- Листать только на новом жесте; инерция того же жеста не даёт второй свайп.
- Во время анимации: колесо **против** движения → откат к origin; **разгон вниз** (`spedUp && pulseGap` или mouse notch) → чейн на следующий snap; **чейн вверх запрещён** (иначе 3→2→1 одним жестом).
- С screen 3 вниз → недосвайп (peek). С exact screen 3 вверх → обычный свайп на screen 2.
- Зона screen 4 + slack: snap off (`scrollTop > screen3.offsetTop - slack * vh`). Вверх — нативный smooth, пока не пересечён `freeLimit`; затем программный свайп на screen 2 с длительностью ∝ дистанции. Не clamp’ить на screen 3 сразу — иначе рывок.
- Compact: CSS-snap; на exact screen 3 вниз — escape за порог `+6` без peek.

### Mobile / compact

- Критерий как в CSS: `max-width: 900px` **или** `(orientation: landscape) and (max-height: 500px)`.
- Не включать desktop wheel-hijack; оставить mandatory snap + escape с screen 3.

### Чего не делать (скролл)

- Не глотать wheel через `preventDefault` без пути к новому жесту (залипание до паузы/движения мыши).
- Не чейнить по одной паузе между тиками без разгона — один флик улетит до peek/screen 4.
- Не оставлять snap `mandatory` в зоне screen 4 / slack — нативный вверх будет рваным или перескочит 3→2.
- Не мерить «скорость» как `delta/dt` на первом тике после паузы — peak занижается, второй тик ложно = разгон.

---

## 1. Структура страницы

- Страница — вертикальная лента полноэкранных секций (`.screen`), каждая высотой `100vh`.
- На mobile (≤900px / compact landscape): `100dvh` для scrollport и экранов — только в media query, не глобально.
- Контент экранов 1–3 закрепляется через `scroll-snap-type: y mandatory` + `.snap` (`scroll-snap-align: start`, `scroll-snap-stop: always`).
- После screen 3: snap off (JS по `getScreen3UpFreeLimit()` / slack), свободный скролл 4–5; с screen 3 вниз на desktop — недосвайп (peek), см. §0.
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
- Экран 5: сплошной белый фон, тёмный текст; высота и превью — см. §8 и §10.
- Фон не должен конкурировать с текстом: каустики приглушённые, палитра near-white / pale blue.
- Exit 3D после screen 3 → screen 4 (`worldRig` вниз). Орбита без зума; rotate только с «пустых» зон; колесо скроллит страницу.
- На `orientationchange` / resize: несколько проходов рефреша (iOS отдаёт размер с задержкой); `setSize(..., false)` + CSS 100% (без инлайн px). При смене portrait↔landscape — `applyResponsiveFraming(false)`, иначе дом уезжает с off-axis якорем.

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

- `.block-16x9`: на desktop — `aspect-ratio: 16 / 9`, `max-width: 380px`.
- На mobile размеры задаются токенами `--media-h-portrait` / `--media-w-portrait` и `--media-h-landscape` / `--media-w-landscape` (оба измерения явно). См. §10.
- **Screen 1:** auto-demo при exact snap: волны `PCB → block-b` + цикл случайных front-окон (каждые 2с; свет после прилёта волны).
- **Screen 2:** `.flatsTableWrap` + таблица; nested scroll у `.browserContent`. Cursor-demo кликает строки 0/1 (dismiss по клику/тачу/скроллу таблицы). Клик → волны `row → PCB → block-b` + окна. Gate: exact `scrollTop ≈ screen-2.offsetTop`.
- **Screen 3:** `.block-16x9.flatsTableWrap` — браузер с flat pages (9/14); `overflow: hidden`, без JS-перехвата жестов — свайп/wheel как у обычного элемента. В любой момент видна ≥1 страница (9 или 14) — нельзя сбрасывать в `is-awaiting-flat` / пустой браузер. Демо-loop: от попадания на screen 3 **до середины screen 4**; typewriter → волны `mic → PCB → block-b` → страница + окна. При остановке оставлять последнюю страницу.
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

- API из `BuildingScene.init`: `lightWindowByNumber`, `turnOffAllWindows`, `lightFlatWindows(nums)`, `ensureFaceVisible(face)`.
- При подсветке квартиры (`lightFlatWindows`) камера орбитой разворачивается к грани окна, если она плохо видна (~как OrbitControls вокруг центра дома).
- Screen 1 cycle вызывает `lightWindowByNumber(n, false)` — без автоповорота (как hero1).

## 8. Формы и экран 5 (контакт)

### Форма

- `.form-container`: колонка, `max-width: 420px`, `gap: 1rem` (desktop); на mobile screen-5 — `gap: 0.5rem`.
- Поля: фон `--snow`, бордер `--smoke`, радиус `8px`; focus → `--blue`.
- Шрифт полей наследует body.
- Кнопка «Отправить»: `.btn.btn-dark`, inline `margin-top: 0.5rem` (учитывать при выравнивании превью).

### Превью-ссылка на revlev.ru (`.site-preview`)

- Внизу **block-b** screen-5: горизонтальный «мессенджерный» баннер (картинка слева, текст справа).
- Картинка: `https://revlev.ru/img/og-small.jpg`; заголовок — Russo One, описание/имя — Inter; на mobile размеры текста как у `p` screen-5, картинка ниже (`88px` vs `116px`).
- **Выравнивание с низом textarea** (desktop + mobile landscape, колонки рядом):
  - у `.site-preview`: `margin-top: auto` (прижать к низу колонки B);
  - `margin-bottom: calc(gap формы + margin-top кнопки + высота .btn.btn-dark)`;
  - высота кнопки: `2 × padding-y + font-size × line-height` (`1.4`);
  - desktop: gap `1rem` + mt `0.5rem`, pad `0.75rem`, fs `0.9375rem`;
  - mobile: gap `0.5rem` + mt `0.5rem`, fs `0.875rem`;
  - mobile **landscape**: pad-y кнопки `0.55rem` (как у `.btn` в landscape-правиле), иначе высота завышается ~0.5rem;
  - **не** использовать `padding-bottom` на `.block-b` / `--s5-submit-space` для этой цели — устаревший костыль.
- Токены: `--s5-form-gap`, `--s5-btn-mt`, `--s5-btn-pad-y`, `--s5-btn-fs`, `--s5-btn-lh`, `--s5-btn-dark-h` (в `maket.css`; временные оверрайды можно держать в `<style>` head, пока не задеплоен css).

### Высота screen-5 на mobile portrait

- Чистым CSS нельзя задать «высота = 2 × фактическая высота block-a».
- JS (`initScreen5PortraitHeight`): измерить `block-a`, выставить у `.screen-content` высоту `2×A + row-gap` и `grid-template-rows: A A`; `.block-b` — `height/min-height: 100%` своей половины.
- В portrait у screen-5 сбрасывать `min-height: 100svh` (`min-height: 0`), иначе пол мешает схеме 2×A.
- На landscape / desktop инлайны JS сбрасывать.
- У `.site-preview` в portrait тоже `margin-top: auto` (внутри высокой половины B).

## 9. Навигация «вниз»

- `.scroll-down` — fixed по центру снизу, bounce-анимация, `pointer-events: none`.
- Скрывается при `scrollTop > 50` (opacity) и полностью на мобиле (`display: none`).

## 10. Адаптив: breakpoint и ориентации

**Breakpoint:** `max-width: 900px` (для 3D top-framing тот же порог + portrait).

**Landscape compact** также при `(orientation: landscape) and (max-height: 500px)` — ловит широкие телефоны (напр. 932×430), где `width > 900`.

Общее для mobile:

- Скрыть `.scroll-down`.
- Скрыть `.btn-secondary` только на screen 1–3.
- Sticky CTA по схеме выше: после якоря screen-4 — `position: absolute`, на screen-5 не «ездит» fixed.
- Не скрывать CTA ради бага с клавиатурой. Корень: `100dvh` у screen 1–4 сжимается → absolute-смещение CTA от screen-1 расходится со spacer на screen-4. При фокусе в поле — `form-keyboard-lock` и фиксация высот 1–4 (и min screen-5) в px; CTA остаётся docked.
- Screen 5 mobile: на landscape — колонки рядом + выравнивание превью (§8); на portrait — одна колонка, высота 2×block-a (JS, §8). На mobile у screen-5 `h2` — `margin-top: 2rem`.

### Portrait (`max-width: 900px` + portrait)

- Сетка: одна колонка, две строки `1fr 1fr` (строго 50% / 50% высоты) — для экранов 1–3.
- **Screen 1–3:** блок B сверху (`order: -1`, `justify-content: flex-end`), блок A снизу.
- **Screen 4–5:** наоборот — A сверху, B снизу.
- **Screen 4:** кнопки отдельно (`display: contents` + `order`): CTA сверху, кнопки из A снизу.
- **Screen 4 кнопки:** колонка (`flex-direction: column`), `white-space: normal`, `width: 100%` — иначе `nowrap` + pill не влезают и уводят текст за край.
- **Screen 5 portrait:** не `1fr 1fr` от viewport, а две строки по **фактической** высоте block-a (JS); block-b на 100% второй строки. См. §8.
- Шрифты и отступы масштабировать через `vh` (`clamp(..., vh, ...)`), чтобы текст помещался в свою половину.
- `.block-16x9` / `.flatsTableWrap`: `width: var(--media-w-*)`, `max-width: 100%`, `height: auto`, `aspect-ratio: 16 / 9`, `flex: 0 0 auto`, `overflow: hidden`. Высота всегда из ширины — нельзя фиксировать `height` и одновременно давать ширине сжаться (mic в `.media-row` на screen 3).
- У `.screen-3 .block-16x9` не использовать `contain: layout` и не ставить `min-width: 0` на сам блок (только на внутренний chrome/URL).
- Mic portrait — см. §7.
- Padding секций: `max(…, env(safe-area-inset-*))`.

### Landscape

- Сетка остаётся `1fr 1fr` (50/50 по ширине).
- Компактные шрифты и padding.
- Safe-area слева/справа обязателен (Dynamic Island / «островок» в landscape): `padding-left/right: max(…, env(safe-area-inset-*))` + `viewport-fit=cover`.
- `.block-16x9` / `.flatsTableWrap`: `width: var(--media-w-landscape)`, `max-width: 100%`, `height: auto`, `aspect-ratio: 16 / 9` — при нехватке места (браузер + mic) ширина жмётся, высота следует; `overflow: hidden`, без `contain: layout`.
- CTA: правая половина / «полочка» справа — не прыгает при смене контента.
- Screen 5: превью выровнено с textarea через `margin-bottom` (§8), не через JS.

### Viewport / высота скролла

- `viewport-fit=cover` в meta viewport; для формы — `interactive-widget=overlays-content`.
- Desktop: `100vh` как раньше.
- Mobile media: `100dvh` для `html`/`body`/`.scroll-container`/`.screen` — не вешать `dvh` глобально (лишние пересчёты на desktop / DevTools).
- Screen 5 (общий mobile fallback): `height: auto`, `min-height: 100svh` (не `dvh`); в **portrait** min сбрасывается в пользу схемы 2×block-a (JS).

## 11. Язык и доступность базы

- `lang="ru"`, viewport `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- Семантика: `<section>` на экраны, заголовки `h1` (первый экран) / `h2` (остальные).
- Preconnect к Google Fonts перед подключением гарнитур.
- OG/Twitter + favicon; превью maket: `maket-og.jpg` на `revlev.ru/img/`.

## 12. Чего не делать

- Не ставить `overflow` на `body` обратно в `auto` — сломается модель скролла.
- Правила свайпа / жестов — см. §0 «Чего не делать (скролл)».
- Не возвращать secondary на mobile screen 1–3 без пересмотра layout; на 4–5 они должны оставаться.
- Не задавать у media-блока фиксированный `height` вместе с возможностью сжатия ширины (`min-width: 0` / flex-shrink) — пропорции ломаются, контент наползает на чёрную рамку. Связка: `width` + `height: auto` + `aspect-ratio: 16 / 9`.
- Не ставить `contain: layout` на `.screen-3 .block-16x9` — ломает расчёт размера на iOS.
- Не позиционировать portrait-mic через `bottom: 50% + …` (середина экрана) — только низ `block-b` с отступом = ½ высоты mic.
- Не копировать mic-fly / `getNearestHeroIndex` из building-3d — демо screen 3 от screen 3 до mid screen 4.
- Не оставлять screen-3 browser пустым (`is-awaiting-flat` без `.flatPage.is-active`) — ни при старте, ни при stop анимации, ни при смене квартиры (предыдущая страница остаётся до reveal).
- Не оставлять инлайн `position/top/left` на CTA после перехода в mobile (сбрасывать через `removeProperty`).
- Не читать `offsetTop` каждый кадр для exit 3D/PCB — кэшировать границы.
- Не усиливать фон (grain/caustics) так, чтобы ухудшалась читаемость `--ink` на белом.
- Не пересчитывать fixed-CTA по `innerHeight` при открытой клавиатуре (фокус в поле формы) — кнопка уезжает на середину экрана.
- Не выравнивать `.site-preview` с textarea через `padding-bottom` у `.block-b` / «магический» `--s5-submit-space` — только `margin-top: auto` + `margin-bottom = gap + mt кнопки + высота кнопки` (§8).
- Не считать «1rem = gap + margin» одним числом: gap и `margin-top` кнопки **складываются** (desktop `1 + 0.5`).
- Не форсировать на screen-5 portrait две колонки ради выравнивания превью — A и B должны быть друг под другом; высота 2×A — через JS.
- Не забывать: после правок `maket.css` нужен деплой **revlev.ru** и бамп `MAKET_DEPLOY` в HTML.