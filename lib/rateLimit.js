// Yengil rate-limit (sobit oyna). Ikki qatlam:
//   1) process xotirasi — bitta serverless instansdagi to'satdan bosishni ushlaydi
//   2) KV (Upstash) — bo'lsa, instanslar aro umumiy hisoblagich
// Ikkalasi ham "fail-open": xato bo'lsa so'rovni bloklamaymiz.

import { kvEnabled, kvIncrWithTtl } from './kv';

const mem = new Map(); // key -> { count, reset }

export function clientIp(req) {
  const h = req.headers;
  const xff = (h.get('x-forwarded-for') || '').split(',')[0].trim();
  return xff || h.get('x-real-ip') || h.get('cf-connecting-ip') || 'unknown';
}

// -> { ok: true } | { ok: false, retryAfter: <soniya> }
export async function rateLimit(key, { limit = 10, windowSec = 60 } = {}) {
  const now = Date.now();

  const m = mem.get(key);
  if (!m || now > m.reset) {
    mem.set(key, { count: 1, reset: now + windowSec * 1000 });
  } else {
    m.count += 1;
    if (m.count > limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((m.reset - now) / 1000)) };
    }
  }

  // xotira o'smasin — eski yozuvlarni tozalab turamiz
  if (mem.size > 5000) {
    for (const [k, v] of mem) if (now > v.reset) mem.delete(k);
  }

  if (kvEnabled) {
    try {
      const n = await kvIncrWithTtl(`oxy:rl:${key}`, windowSec);
      if (n > limit) return { ok: false, retryAfter: windowSec };
    } catch {
      /* fail-open */
    }
  }

  return { ok: true };
}

// Next.js route'lar uchun qulay yordamchi. Limit oshsa 429 Response qaytaradi,
// aks holda null (davom eting).
export async function limitOr429(req, name, opts) {
  const res = await rateLimit(`${name}:${clientIp(req)}`, opts);
  if (res.ok) return null;
  return new Response(
    JSON.stringify({ ok: false, error: 'rate_limited', retryAfter: res.retryAfter }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(res.retryAfter),
      },
    }
  );
}
