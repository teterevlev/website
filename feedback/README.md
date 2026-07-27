# feedback — Cloudflare Worker → Telegram

> Прод сейчас на VPS: см. `../feedback-vps/`. Эта папка — тот же API на Cloudflare Worker, на будущее.

Папка `feedback` — исходники edge-функции. Node на своём компьютере не нужен: код крутится на Cloudflare.

Форма на `maket.revlev.ru` шлёт `POST` на URL Worker’а (`*.workers.dev`). Отдельный домен **не нужен**.

## Что нужно заранее

1. Бот в Telegram: [@BotFather](https://t.me/BotFather) → `/newbot` → токен.
2. Написать боту любое сообщение (иначе `sendMessage` не дойдёт).
3. Свой **user id** (число): [@userinfobot](https://t.me/userinfobot) / `@getidsbot`.
4. Код `feedback/` уже в GitHub (этот репозиторий).

---

## Заполнение формы «Set up your application»

**Ship something new** → **Continue with GitHub** → выбрать репозиторий `revlev.ru` (или как он называется у вас на GitHub).

| Поле | Что писать | Зачем |
|------|------------|--------|
| **Project name** | `revlev-feedback` | Должно **точно** совпадать с `name` в `wrangler.toml`. Иначе билд упадёт. |
| **Build command** | *пусто* | Собирать нечего — один JS-файл. |
| **Deploy command** | `npx wrangler deploy` | Дефолт Cloudflare. Wrangler скачает и задеплоит сам. |
| **Builds for non-production branches** | **выкл** | Не нужны превью с feature-веток. Включите только если хотите. |

### Advanced

| Поле | Что писать | Зачем |
|------|------------|--------|
| **Path** | `feedback` | Корень Worker’а в репо. Без этого Cloudflare ищет `wrangler.toml` в корне репозитория и не найдёт. |
| **API token** | *пусто* | Не заполнять. Доступ к аккаунту уже через «Continue with GitHub». Токен нужен только для внешних CI (GitHub Actions и т.п.). |
| **Variable name / Variable value** | *пусто на этом шаге* | Это переменные **сборки**, не рантайма Worker’а. Секреты Telegram задаются **после** деплоя (см. ниже). |

Дальше — **Save and Deploy** (или аналог).

После успеха откройте Worker → скопируйте URL вида:

```text
https://revlev-feedback.<ваш-subdomain>.workers.dev
```

Вставьте его в `maket/index.html` в `action` у `#feedback-form` (вместо `YOUR_SUBDOMAIN`).

---

## Секреты (после первого деплоя)

Worker → **Settings** → **Variables and Secrets** → **Add**:

| Type | Name | Value |
|------|------|--------|
| **Secret** | `TELEGRAM_BOT_TOKEN` | токен от BotFather |
| **Secret** | `TELEGRAM_USER_ID` | ваш числовой id, например `123456789` |

`ALLOW_ORIGINS` уже прописан в `wrangler.toml` и подтянется при деплое. Если в Settings его нет — добавьте как **Plain text / Variable**:

```text
https://maket.revlev.ru,https://revlev.ru
```

После смены секретов повторный деплой обычно не нужен — они применяются сразу. После правок кода — обычный `git push` в ветку, которую подключил Cloudflare.

---

## Проверка

```bash
curl -i -X POST 'https://revlev-feedback.<subdomain>.workers.dev/' \
  -H 'content-type: application/json' \
  -H 'origin: https://maket.revlev.ru' \
  -d '{"name":"Test","contact":"+7…","message":"hello"}'
```

Ожидается `{ "ok": true }` и сообщение в Telegram.

---

## API

`POST /` — JSON или form-data:

```json
{
  "name": "Имя / Компания",
  "contact": "Телефон или Email",
  "message": "Описание задачи"
}
```

---

## Опционально: деплой с ноутбука

Только если не хотите Git Builds:

```bash
cd feedback
npm install
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_USER_ID
npm run deploy
```
