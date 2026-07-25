/**
 * Cloudflare Worker: форма → Telegram Bot API
 *
 * Secrets:
 *   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
 *   TELEGRAM_USER_ID   — числовой chat_id / user id получателя
 *
 * Vars:
 *   ALLOW_ORIGINS — CSV разрешённых Origin (CORS)
 */

const MAX_NAME = 200;
const MAX_CONTACT = 200;
const MAX_MESSAGE = 2000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOW_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405, cors);
    }

    if (!isOriginAllowed(origin, env.ALLOW_ORIGINS)) {
      return json({ ok: false, error: "origin_not_allowed" }, 403, cors);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_USER_ID) {
      return json({ ok: false, error: "server_misconfigured" }, 500, cors);
    }

    let body;
    try {
      body = await parseBody(request);
    } catch {
      return json({ ok: false, error: "invalid_body" }, 400, cors);
    }

    const name = clean(body.name, MAX_NAME);
    const contact = clean(body.contact, MAX_CONTACT);
    const message = clean(body.message, MAX_MESSAGE);

    if (!name || !contact) {
      return json({ ok: false, error: "required_fields" }, 400, cors);
    }

    const text = [
      "📩 Новая заявка с maket.revlev.ru",
      "",
      `👤 Имя / компания: ${name}`,
      `📞 Контакт: ${contact}`,
      message ? `💬 Задача:\n${message}` : "💬 Задача: —",
    ].join("\n");

    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_USER_ID,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      const detail = await tgRes.text().catch(() => "");
      console.error("telegram_error", tgRes.status, detail.slice(0, 500));
      return json({ ok: false, error: "telegram_failed" }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  },
};

function clean(value, max) {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").trim().slice(0, max);
}

async function parseBody(request) {
  const type = (request.headers.get("content-type") || "").toLowerCase();

  if (type.includes("application/json")) {
    const data = await request.json();
    return {
      name: data.name,
      contact: data.contact,
      message: data.message,
    };
  }

  if (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return {
      name: form.get("name"),
      contact: form.get("contact"),
      message: form.get("message"),
    };
  }

  throw new Error("unsupported_content_type");
}

function parseAllowList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowRaw) {
  if (!origin) return false;
  const list = parseAllowList(allowRaw);
  return list.includes(origin) || list.includes("*");
}

function corsHeaders(origin, allowRaw) {
  const headers = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };

  if (origin && isOriginAllowed(origin, allowRaw)) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }

  return headers;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}
