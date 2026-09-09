// Yengil KV klienti — Upstash Redis REST API (Vercel KV ham shu protokol).
// Tashqi kutubxona kerak emas: oddiy fetch orqali ["CMD", ...args] yuboramiz.
//
// Vercel'da: "Storage -> KV / Upstash" ni ulang, u quyidagi env larni beradi:
//   KV_REST_API_URL, KV_REST_API_TOKEN   (yoki UPSTASH_REDIS_REST_URL / _TOKEN)
// Lokalda bu env lar bo'lmasa — productStore.js avtomatik data/products.json ga yozadi.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const kvEnabled = Boolean(URL_ && TOKEN);

async function command(args) {
  if (!kvEnabled) throw new Error('KV is not configured');
  const res = await fetch(URL_, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`KV ${args[0]} failed: HTTP ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(`KV ${args[0]} error: ${json.error}`);
  return json.result;
}

export function kvGet(key) {
  return command(['GET', key]);
}

export function kvSet(key, value) {
  return command(['SET', key, typeof value === 'string' ? value : JSON.stringify(value)]);
}

// Faqat kalit mavjud bo'lmaganda o'rnatadi. true = yangi yozildi, false = bor edi.
// Idempotentlik qo'riqchisi (masalan to'lov callback dedup) uchun.
export async function kvSetNx(key, value, ttlSeconds) {
  const args = ['SET', key, typeof value === 'string' ? value : JSON.stringify(value), 'NX'];
  if (ttlSeconds) args.push('EX', String(ttlSeconds));
  const r = await command(args);
  return r === 'OK';
}

export function kvDel(key) {
  return command(['DEL', key]);
}

// Atomik hisoblagich — rate-limit oynasi uchun. Birinchi INCR'da TTL o'rnatiladi.
export async function kvIncrWithTtl(key, ttlSeconds) {
  const n = Number(await command(['INCR', key])) || 0;
  if (n === 1 && ttlSeconds) {
    try {
      await command(['EXPIRE', key, String(ttlSeconds)]);
    } catch {
      /* TTL o'rnatilmasa ham hisoblagich ishlayveradi */
    }
  }
  return n;
}
