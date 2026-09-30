# ТЗ: блок об авторе на главной и страница /about — research.revlev.org

## 0. Контекст и рамки

- Правки только в research.revlev.org, revlev.org не трогаем.
- Текущий дизайн сохраняем: токены из `blog.css` (Inter + Russo One, акцент `--blue`, фон `--blue-pale`, белая карточка `.site-main`), переключатель темы light/dark через `data-theme`.
- Весь контент сайта на английском.
- **Не упоминаем:** embedded/железо, названия компаний и работодателей, поиск работы, «open to work», локацию, языки, резюме в PDF. Теги пока не вводим.
- Цель: читатель статьи (и Google) за 10 секунд понимает, кто автор и почему ему можно верить (E-E-A-T), при этом блок не превращается в резюме.

## 1. Что делаем

1. **Блок об авторе на главной** — между шапкой страницы и списком статей. Не текстовый абзац, а bento-сетка из плиток разного вида (см. §3).
2. **Страница `/about/`** — чуть подробнее, с полным стеком (см. §4).
3. **Карточка автора в конце каждой статьи** — маленькая, со ссылкой на `/about/` (см. §5).
4. **Ссылка «About»** в шапке и в футере.
5. **Структурированные данные** (JSON-LD) под E-E-A-T (см. §7).

## 2. Единый источник данных

Весь контент блока (роль, строка про надёжность, цифры, фокус-чипы, open source, образование, стек) хранится в одном файле `data/author.yaml`. Его читают три partial-шаблона:

- `partials/author-bento.html` — блок на главной;
- `partials/author-card.html` — карточка в конце статьи;
- шаблон страницы `/about/` (или `layouts/about/single.html`, или `layout: about` во front matter `content/about.md`).

Так тексты и цифры правятся в одном месте. Фото — через Hugo image processing (см. §6), не через `static/`.

## 3. Блок на главной (bento)

### 3.1. Место и заголовки

- Порядок на главной: `page-intro` («Research» + подзаголовок) → **bento об авторе** → список статей.
- H1 главной остаётся «Research». Имя в bento — не H1 (`p` или `h2` визуально крупный). H1 с именем будет на `/about/`.
- Подзаголовок «Notes on Robotics and AI by Oleg Teterevlev.» оставляем.

### 3.2. Сетка

Ширина: см. вопрос 1 в §9. Базовый вариант — текущие 40rem (640px) контента, сетка на 2 колонки; если главную расширяем до ~52rem — 3 колонки.

Плитки (desktop, 2 колонки):

| Ряд | Плитка | Ширина |
|---|---|---|
| 1 | A. Портрет + кто я | обе колонки |
| 2 | B. Цифры (4 значения) | обе колонки |
| 3 | C. Open source | 1 колонка |
| 3 | D. Фокус (чипы) | 1 колонка |
| 4 | E. Образование + ссылка «More about me» | обе колонки, низкая полоса |

Плитки визуально разные: A — тёмная, B — без фона, только цифры с разделителями, C — с мини-схемой, D — чипы, E — узкая строка. Общие правила: радиус 12px (как у `.site-main`), зазор `--sp-sm`, внутренний отступ `--sp-md`, рамка `1px solid var(--mist)` у светлых плиток.

### 3.3. Плитка A — портрет

**Композиция.** Текст слева, фото справа. На фото человек смотрит влево — фото справа, взгляд в текст. Не зеркалить.

**Светлая тема.** Обычная плитка: фон `--white`, рамка `1px solid var(--mist)`. Текст: имя `--ink` (Russo One ~1.75rem); роль Inter 500 `--blue-deep` `--fs-lg`; строка про надёжность Inter 400 `--graphite` `--fs-base`. Фото — круг 200–220px из `author-face.jpg`, ободок `2px solid var(--mist)`. Кроп подтянуть по лицу (`background-size` / `background-position`), чтобы светлый край окна справа сверху не попадал в кадр.

**Тёмная тема.** Панель `#0F1013` с рамкой `--mist`. Фото `author-hero.jpg` прямоугольное, прижато к правому краю на всю высоту панели; левый край растворяется: `mask-image: linear-gradient(to right, transparent 0%, #000 45%)`. Текст светлый: имя белый; роль `--blue-ink`; строка `#C4C8CF`. Контраст ≥ WCAG AA.

**Переключение.** Через `[data-theme]`. Фото плитки A задавать как `background-image` (CSS-переменные), не двумя `<img>` — браузер качает только вариант текущей темы. `alt` → `aria-label` на элементе фото.

Высота панели на desktop ~260–300px.

**Текст:**

- Name: **Oleg Teterevlev**
- Role: **Robotics/AI Engineer**
- Line: *15 years of systems where failure is expensive — power plants, drones, warehouse robots — taught me to care about correctness, edge cases and observability. Here I write about bringing that to AI.*

### 3.4. Плитка B — цифры («by the numbers»)

Формат: крупная цифра + короткая подпись под ней, без иконок и без фона плитки. Четыре колонки на desktop, 2×2 на мобильном. Между колонками тонкие вертикальные разделители `--mist`.

- Цифра: Russo One, `clamp(1.75rem, 5vw, 2.25rem)`, цвет `--ink`; суффикс (`+`, `k`, `M`, `×`) цветом `--blue`.
- Подпись: Inter 400, `--fs-sm`, `--graphite`, максимум две строки.
- Разметка — `<dl>` (`<dt>` подпись / `<dd>` число) или `<ul>` с понятным текстом для скринридеров: число и подпись должны читаться как одна фраза.
- Без анимации «счётчика». Если хочется движения — только появление при скролле, и отключать при `prefers-reduced-motion`.

**Значения** (названия компаний не указываем):

| Цифра | Подпись |
|---|---|
| 15+ | years shipping production systems |
| 24k | requests per second at peak on a backend I maintained |
| 5M | daily active users on that platform |
| 2× | fewer search queries after an Elasticsearch rework |

Запасное значение, если одно захочется заменить: **8M** — products synced in real time through Kafka.

### 3.5. Плитка C — open source

- Надзаголовок: `OPEN SOURCE` (стиль как `.post-date`: `--fs-xs`, uppercase, letter-spacing).
- Заголовок: **pydantic-ai-escalation** (моноширинный или Inter 600).
- Описание: *Retry the cheap model with the validation error; escalate to a stronger one only when that fails.*
- Мини-схема из трёх шагов — HTML/CSS или inline SVG, не картинка: `cheap ✗ → cheap + error ✗ → strong ✓`. Крестики серые, галочка `--blue`. Должна помещаться в ширину плитки без горизонтального скролла; на узкой ширине — вертикально.
- Две ссылки: **GitHub →** (https://github.com/teterevlev/pydantic-ai-escalation) и **Read the article →** (/posts/escalating-on-validation-failure/).
- Фон плитки: `color-mix(in srgb, var(--blue) 6%, var(--white))`.

### 3.6. Плитка D — фокус

- Надзаголовок: `WORKING WITH`.
- Чипы (pill: радиус 999px, `--fs-sm`, фон `--ash`, рамка `--mist`, без ссылок):
  - Agentic workflows
  - Claude Code · Codex
  - Pydantic AI
  - MCP
  - Evals & golden datasets
  - Model routing & escalation
  - Context engineering
  - ROS 2
  - MAVLink
- Языков программирования здесь нет — они только на `/about/`.
- Два робототехнических чипа (ROS 2, MAVLink) можно выделить контурным стилем (рамка `--blue-light`, прозрачный фон), чтобы визуально разделить AI и робототехнику без подзаголовков.

### 3.7. Плитка E — образование и ссылка

Одна строка, слева текст, справа ссылка:

- `MSc × 2 — Robotic systems · Control in technical systems`
- ссылка **More about me →** на `/about/`

### 3.8. Мобильная версия (< 640px)

- Всё в одну колонку, порядок: A → B → C → D → E.
- Плитка A, светлая: круг ~160px по центру над текстом (`author-face.jpg`).
- Плитка A, тёмная: полоса `author-band.jpg` высотой ~220px на всю ширину, маска градиентом вниз (`to bottom`) в цвет панели, текст под фото.
- Плитка B: 2×2, разделители горизонтальные и вертикальные.
- Горизонтального скролла нет нигде; проверить на 360px.

## 4. Страница `/about/`

Нужна: это целевая ссылка для карточки автора, страница с H1 = имя и носитель разметки `ProfilePage`. Держим её короткой — одна прокрутка на ноутбуке.

Структура:

1. **H1:** Oleg Teterevlev. Под ним роль (как в плитке A).
2. **Фото** — круглое (~240px) из `author-face.jpg` в обеих темах; справа от текста на desktop.
3. **Абзац о себе** (2–3 предложения): текущая специализация + строка про системы, где ошибка дорого стоит + о чём этот блог.
   Черновик: *I'm a Senior Software Engineer focused on LLM-based and agentic systems that have to be reliable and cost-efficient in production: model routing, validation, evals, observability. Before that I spent years on systems where failure is expensive — power plants, drones, warehouse robots — and that's the lens I bring to AI. This site is where I write up what works.*
4. **By the numbers** — те же 4 цифры (переиспользовать partial плитки B).
5. **Stack** — три строки, каждая «метка: значения»:
   - **Languages:** Python, Go, TypeScript, C++
   - **AI engineering:** Claude Code, Codex, Pydantic AI, MCP, LLM APIs (structured outputs, tool calling, streaming), evals (regression tests, golden datasets), model routing & escalation, prompt & context engineering, agentic workflows
   - **Infrastructure & robotics:** PostgreSQL, Kafka, Elasticsearch, Redis, Docker, Kubernetes, gRPC, GitHub Actions, ROS 2, MAVLink
6. **Open source** — pydantic-ai-escalation (та же плитка C).
7. **Education** — одна строка, как в E.
8. **Elsewhere** — LinkedIn, GitHub, Telegram.

Не включать: компании, даты, обязанности, языки, локацию, PDF.

## 5. Карточка автора в конце статьи

- Место: после текста статьи и сносок/References, над футером; разделитель `border-top: 1px solid var(--mist)`.
- Состав: круглое фото 56px слева · справа имя (Inter 600) + роль одной строкой (`--graphite`, `--fs-sm`) + ссылка **About the author →** на `/about/`.
- Выводится на всех страницах типа `posts`, не на главной и не на `/about/`.

## 6. Фото

- Три файла в `assets/img/`:
  - `author-face.jpg` — кроп по лицу для кругов (плитка A light, карточка 56px, `/about/`);
  - `author-hero.jpg` — широкий/портретный кадр для плитки A dark desktop;
  - `author-band.jpg` — горизонтальная полоса для плитки A dark mobile.
- Обрабатывать через Hugo `.Resize` / `.Fill` (WebP по возможности; jpg допустим).
- **Плитка A:** фото через CSS `background-image` и переменные `--author-a-photo` / `--author-a-photo-mobile` под `[data-theme]`, не двумя `<img>`. Кроп круга поджать по лицу.
- **Карточка и `/about/`:** круглые `<img>` из `author-face` в обеих темах; `width`/`height`, lazy в карточке, eager на about.
- `alt` / `aria-label`: `Oleg Teterevlev`.
- Не применять к фото фильтров в тёмной теме.
- Отдельная OG-картинка для `/about/` 1200×630 — позже; пока дефолтный `img/og.jpg`.

## 7. SEO и разметка

- В `<head>`: `Person` с `@id` `https://research.revlev.org/about/#person`, `jobTitle` = Robotics/AI Engineer, `image` (URL фото), `knowsAbout`: `["LLM agents", "Agentic workflows", "Model routing", "LLM evaluation", "Robotics software", "ROS 2"]`. `sameAs`: `https://revlev.org/#person`, LinkedIn, GitHub, t.me/oleg_teterevlev.
- На `/about/`: `ProfilePage` с `mainEntity` → тот же `Person` (по `@id`).
- На статьях: `BlogPosting` с `author: {"@id": ...}`, `datePublished`, `dateModified`, `image`, `headline` — если ещё нет.
- `<title>` и `description` для `/about/`: `About — Oleg Teterevlev` / одна фраза с ролью.
- `/about/` попадает в sitemap; в RSS не попадает.
- Проверить в Rich Results Test и валидаторе schema.org.

## 8. Навигация

- Шапка: добавить **About** рядом с «Research» (тем же стилем `.header-link`). Сейчас `.header-nav` скрывается на мобильном — ссылка About должна оставаться видимой на мобильном (вынести из `.header-nav` или не скрывать её).
- Футер: `Oleg Teterevlev · PCB · Research · About`.
- Активный пункт подсвечивать (`--ink`, как `.header-title`).

## 9. Открытые вопросы

1. **Ширина главной.** Главная и `/about/` — ~52rem (`site-main--wide`); статьи — 40rem.
3. **Цифры.** 15+ / 24k / 5M / 2×.
4. **JSON-LD `Person`.** На research — отдельный `@id` `https://research.revlev.org/about/#person` + `sameAs` на `https://revlev.org/#person` (чтобы jobTitle не конфликтовал с org).
5. ~~**Фото для плитки A.**~~ Решено: три файла face / hero / band в `assets/img/`.

## 10. Приёмка

- Обе темы: блок выглядит цельно, у тёмной панели не видно шва между фото и фоном, текст читается (AA).
- Ширины 360 / 768 / 1280px: нет горизонтального скролла, лицо на фото не обрезано.
- Lighthouse: Performance и SEO на главной не ниже текущих; CLS ≈ 0.
- Нигде на сайте нет названий компаний, «embedded», локации, языков, упоминаний поиска работы.
- Все цифры и тексты правятся в одном файле `data/author.yaml`.
- Разметка проходит Rich Results Test без ошибок.