# Intro: интерактивный макет (screen 0)

Полноэкранная сцена с фото макета, подсветкой окон, планшетом-управлением и продолжением тёмной мраморной плоскости под кадром. Стоит первым экраном лендинга (`screen-0`).

## Файлы

| Путь | Роль |
|------|------|
| `maket_v2/window-light.html` | **Лаборатория / источник правды** — править сцену здесь |
| `maket/intro/index.html` | Копия для деплоя (ассеты на `../img/intro/`) + bridge жестов к родителю |
| `maket/img/intro/` | `maket_base.jpg`, `maket_off.jpg`, `maket_all.jpg`, `tablet.webp`, `mic_large.png` |
| `maket/index.html` | iframe `.intro-frame` → `intro/index.html`; приём `postMessage` |
| `maket/css/maket.css` | `.screen-0`, `.intro-frame` |

Деплой только папки `maket/` (см. `DEPLOY.md`). После правок CSS — бамп `MAKET_DEPLOY` / `?v=` в `maket/index.html`.

### Синхронизация лаборатории → продакшен

1. Править `maket_v2/window-light.html` (и при необходимости ассеты в `maket_v2/`).
2. Скопировать HTML в `maket/intro/index.html`, поправив пути ассетов на `../img/intro/…`.
3. Сохранить в intro bridge жестов (`maket-intro-wheel` / `maket-intro-swipe`) — в лаборатории его нет.
4. При смене картинок — обновить `maket/img/intro/`.

## Встраивание в лендинг

```html
<section class="screen snap screen-0" aria-label="Intro">
  <iframe class="intro-frame" src="intro/index.html" …></iframe>
</section>
```

- `.screen-0`: `padding: 0`, `overflow: hidden`, фон `#000`, `display: block` (не grid/flex остальных экранов).
- iframe на весь экран (`position: absolute; inset: 0`), `touch-action: pan-y`.
- Стрелка `.scroll-down` на intro белая (`handleScroll`: `st < screen1.offsetTop`).

### Почему iframe

Сцена самодостаточна (`html[data-layout]`, свой canvas, fixed-слои). Iframe изолирует CSS/JS от лендинга. Wheel/touch **не всплывают** из iframe — нужен bridge.

### Bridge жестов → скролл лендинга

Wheel/touch из iframe **не всплывают**. Мост (детали и грабли — `LAYOUT_RULES.md` §0 «Intro iframe»):

**В intro** (`maket/intro/index.html`):

- `wheel` → `postMessage({ type: "maket-intro-wheel", deltaY, … })`
- вертикальный touch-swipe (|Δy| > 70px, &lt; 900ms) → `{ type: "maket-intro-swipe", dir: ±1 }`

**В родителе** — отдельный путь, **не** полный `onSnapWheel`:

- только пока `scrollTop < screen1.offsetTop − 4`
- игнор при `programmaticScroll` / `swipeIgnoreUntil`
- вниз → ровно один `startSnapSwipe(screen1)` + флаг `swipeFromFirstSnap` (без чейна 0→1→2)

Snap-цепочка: **0 → 1 → 2 → 3** → peek / screen 4–5.

## Раскладка сцены (внутри intro)

Режимы на `document.documentElement`:

| `data-layout` / `data-fit` | Условие | Поведение |
|----------------------------|---------|-----------|
| `desktop` + `contain` | width ≥ 1150 и не short-landscape | canvas влезает в wrap; parallax |
| `desktop` + `crop` | 700–1149, высота &gt; 500 или portrait | высота как при 1150, обрезка по бокам; parallax |
| `phone` | width &lt; 700 **или** landscape и height ≤ 500 | full-bleed / landscape-compact; parallax выкл |

Телефоны в landscape часто шире 700px (844–932) — без проверки высоты уходили в desktop и раздували планшет. Порог высоты как у compact в лендинге (`PHONE_LANDSCAPE_MAX_H = 500`).

Константы: `REF_W = 1150`, `MAC_W = 1440`, `PHONE_MAX = 700`, `TABLET_RATIO = 0.68`.

- Landscape phone: `--tablet-w: min(42vw, 52vh, 360px)` — учитывает высоту; canvas `max-width/max-height: 100%`.
- Ширина планшета (desktop): `--tablet-w` от ширины canvas (на ≥ MacBook — 68%; между MacBook и 1150 — заморозка абсолютного размера MacBook; ниже — плавное уменьшение).
- `applyLayout()` полностью сбрасывает inline-стили canvas/tablet перед пересчётом (resize = cold load).
- На canvas и `#tabletWrap` **нет** CSS `transition` на `transform` — иначе parallax дёргается.

### Parallax

- Desktop: `pointermove` → смещение canvas (назад) и планшета (вперёд) вдоль оси наклона `TILT`.
- Над непрозрачными пикселями планшета (alpha-map) parallax замирает — клики идут в UI планшета.
- Phone: parallax не крутится.

## Плоскость под макетом (`#belowTablet`)

Продолжение тёмного мрамора из фото до низа viewport: скошенный верх, горизонтальный низ.

| Константа | Значение | Смысл |
|-----------|----------|--------|
| `PLANE_ANGLE` | −16.56° | угол верхней кромки (замерен) |
| `PLANE_MID_Y` | 0.587 | высота кромки по центру кадра (доля высоты изображения) |
| `PLANE_LIFT` | 70 (px) | подъём кромки; масштабируется от высоты canvas (`PLANE_LIFT_REF_H = 720`) |
| `PLANE_LIFT_REF_H` | 720 | высота canvas, при которой 70px совпадает с ручной подгонкой |

Геометрия:

1. Линия в координатах изображения:  
   `y_norm(x) = PLANE_MID_Y + (x − 0.5) · dy`,  
   где `dy = |tan(PLANE_ANGLE)| · (width/height)`.
2. Сэмпл линии на **левом и правом краю viewport** (не на краях canvas) — иначе при parallax кромка едет в противофазе с фото.  
   **Исключение — phone landscape:** canvas уже viewport → сэмпл и `#belowTablet` по боксу canvas (иначе экстраполяция уводит кромку слишком высоко).
3. `clip-path: polygon(…)` на `#belowTablet`.
4. `PLANE_LIFT` масштабируется: `lift = 70 * clamp(cr.height / 720, 0.25…1.15)` — на коротком landscape 70px слишком много.

Градиент фона:

```css
linear-gradient(to bottom left, #16171b 0%, #000 100%)
```

Правый верх ≈ `#16171b` (замер по фото), правый низ / низ экрана → `#000`, направление — к левому низу.

## UI на планшете

- Семь тумблеров домов (`HOUSES` / зоны окон) + подписи Russo One; axonometric `rotate` + `skewX`.
- Микрофон: voice-demo (typewriter → подсветка окон), как на screen 3 лендинга.
- API на `window.maket`: `setLight`, `setHouse`, `setWindow`, `setDemo`, …

Подсветка окон: canvas-композиция `maket_base` + маски из `maket_off` / `maket_all` по сетке зон (`ZONES` / `GRIDS`).

## Чего не делать

- Не править продакшен-intro без копирования из `maket_v2/window-light.html` (или наоборот — разъедутся).
- Не считать кромку плоскости только по `getBoundingClientRect()` canvas left/right при full-bleed clip — нужен сэмпл на краях viewport.
- Не вешать `transition: transform` на canvas/tablet при parallax.
- Не убирать gesture bridge из `maket/intro/index.html` — со screen-0 нельзя будет уехать колесом/свайпом.
- Не прогонять intro-wheel через полный `onSnapWheel` + chain — трекпад унесёт на несколько экранов (см. `LAYOUT_RULES.md` §0).
- Не ставить padding у `.screen-0` как у остальных `.screen` — iframe должен быть edge-to-edge.
