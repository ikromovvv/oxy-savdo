// cs2shop Merchant API — skin sotib olish + xaridorga Steam trade offer.
// Hujjat: https://cs2shop.net/docs
//
// .env.local / Vercel:
//   CS2SHOP_MERCHANT_ID, CS2SHOP_API_KEY     (merchant panel -> Account)
//   CS2SHOP_MIN_MARGIN_USD = 0.5             (sotuv narxidan shuncha past tannarxdan qimmat sotib olmaymiz)
//
// Oqim: nom bo'yicha listing qidirish (yoki listingId) -> eng arzon, hozir trade
// qilsa bo'ladigan listingni `POST /v1/merchant/trades` bilan sotib olish.
// providerRef = externalRef (barqaror kalit); holat `trades/by-external-ref` orqali.
//
// Idempotentlik: har bir buyurtma elementi uchun BITTA externalRef. Timeout / 5xx
// bo'lsa avval shu ref bo'yicha lookup qilamiz (buyurtma allaqachon yaratilgan bo'lishi mumkin).
// Yakuniy muvaffaqiyatsiz (FAILED/CANCELLED/EXPIRED) bo'lgan ref qayta ishlatilmaydi —
// yangi urinish `~2`, `~3` ... qo'shimchali ref bilan. REVERSED bo'lsa qayta sotib OLMAYDI.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const id = 'cs2shop';

const BASE = process.env.CS2SHOP_BASE_URL || 'https://cs2shop.net';
const TIMEOUT_MS = 15000;
const MAX_REF_ATTEMPTS = 8;
const MAX_CANDIDATES = 3;

const merchantId = () => process.env.CS2SHOP_MERCHANT_ID || '';
const apiKey = () => process.env.CS2SHOP_API_KEY || '';
const minMargin = () => {
  const v = Number(process.env.CS2SHOP_MIN_MARGIN_USD);
  return Number.isFinite(v) && v >= 0 ? v : 0.5;
};

export function configured() {
  return Boolean(merchantId() && apiKey());
}

// -> { status, data }. Tarmoq xatosi/timeout: { status: 0, data: null, networkError }
async function api(method, path, { query, body } = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, String(v));
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'x-merchant-id': merchantId(),
        'x-api-key': apiKey(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json().catch(() => null) : null;
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: null, networkError: e.message };
  }
}

const errCode = (r) => r.data?.error || r.data?.code || null;
const errMsg = (r) =>
  r.networkError
    ? `cs2shop tarmoq xatosi: ${r.networkError}`
    : `cs2shop ${errCode(r) || 'HTTP ' + r.status}${r.data?.message ? ': ' + String(r.data.message).slice(0, 160) : ''}`;

// trade.status -> { state, detail, error }
export function mapTrade(t) {
  const s = String(t?.status || '').toUpperCase();
  const why = t?.failReason || null;
  switch (s) {
    case 'PENDING':
      return { state: 'processing', detail: s };
    case 'SENT':
      return { state: 'sent', detail: s };
    case 'COMPLETED':
      return { state: 'done', detail: s };
    case 'REVERSED':
      return { state: 'error', detail: s, error: `cs2shop: savdo bekor qilindi (REVERSED) — ${why || 'sabab noma\'lum'}. Qo'lda tekshiring`, final: true };
    case 'CANCELLED':
    case 'FAILED':
    case 'EXPIRED':
      return { state: 'error', detail: s, error: `cs2shop: ${s}${why ? ' — ' + why : ''}`, retryable: true };
    default:
      return { state: 'processing', detail: s || null };
  }
}

async function lookup(externalRef) {
  const r = await api('GET', '/v1/merchant/trades/by-external-ref', { query: { externalRef } });
  if (r.status === 200 && r.data) return { found: true, trade: r.data };
  if (r.status === 404) return { found: false };
  return { found: null, error: errMsg(r) }; // noma'lum
}

const availableNow = (l) => !l.availableAfter || Date.parse(l.availableAfter) <= Date.now();

// Nom bo'yicha nomzod listinglar: hozir trade qilsa bo'ladigan, narx <= cap, arzondan qimmatga
async function findCandidates(marketHashName, cap) {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const r = await api('GET', '/v1/merchant/listings', {
      query: { search: marketHashName, limit: 500, page },
    });
    if (r.status !== 200 || !r.data) throw new Error(errMsg(r));
    const items = r.data.items || [];
    for (const l of items) {
      if (l.market_hash_name === marketHashName && availableNow(l)) out.push(l);
    }
    if (page * 500 >= (r.data.total || 0)) break;
  }
  out.sort((a, b) => a.price - b.price);
  return { all: out.length, list: out.filter((l) => !cap || l.price <= cap).slice(0, MAX_CANDIDATES) };
}

// { marketHashName, listingId?, maxPriceUSD, salePriceUSD?, tradeUrl, customId }
export async function buy({ marketHashName, listingId, maxPriceUSD, salePriceUSD, tradeUrl, customId }) {
  if (!configured()) return { ok: false, error: 'cs2shop sozlanmagan', state: 'error' };
  if (!tradeUrl) return { ok: false, error: "Trade URL yo'q", state: 'error' };

  // Narx shipi: sotuv narxidan minimal marjani ayirib tashlaymiz (zarar ko'rib sotmaslik uchun)
  const sale = Number(salePriceUSD) || 0;
  const cap = sale > 0 ? Math.max(0, sale - minMargin()) : Number(maxPriceUSD) || 0;

  let candidates;
  try {
    if (listingId) {
      const r = await api('GET', `/v1/merchant/listings/${encodeURIComponent(listingId)}`);
      const l = r.data?.item;
      if (r.status !== 200 || !l) throw new Error(errMsg(r));
      candidates = { all: 1, list: availableNow(l) && (!cap || l.price <= cap) ? [l] : [] };
    } else {
      candidates = await findCandidates(marketHashName, cap);
    }
  } catch (e) {
    return { ok: false, error: e.message, state: 'error' };
  }
  if (!candidates.list.length) {
    return {
      ok: false,
      state: 'error',
      error: candidates.all
        ? `cs2shop: "${marketHashName}" narxi oshib ketdi (limit $${cap.toFixed(2)})`
        : `cs2shop: "${marketHashName}" hozir mavjud emas`,
    };
  }

  let lastError = 'cs2shop: sotib olib bo\'lmadi';
  for (const l of candidates.list) {
    const expected = Math.max(l.price, Math.min(cap || Infinity, Math.round(l.price * 1.02 * 100) / 100));

    for (let attempt = 1; attempt <= MAX_REF_ATTEMPTS; attempt++) {
      const externalRef = attempt === 1 ? customId : `${customId}~${attempt}`;
      const r = await api('POST', '/v1/merchant/trades', {
        body: { externalRef, listingId: l.listingId, expectedPriceUsd: expected, tradeUrl },
      });

      if (r.status === 200 && r.data) {
        return { ok: true, providerRef: externalRef, ...mapTrade(r.data), detail: `cs2shop ${r.data.status} $${r.data.priceUsd}` };
      }

      const code = errCode(r);

      // Xuddi shu ref bilan buyurtma allaqachon bor — qayta sotib OLMAYMIZ, holatiga qaraymiz
      if (code === 'duplicate_external_ref' || r.status === 0 || r.status >= 500) {
        const lk = await lookup(externalRef);
        if (lk.found) {
          const m = mapTrade(lk.trade);
          if (m.final) return { ok: false, state: 'error', error: m.error };
          if (!m.retryable) return { ok: true, providerRef: externalRef, ...m };
          continue; // bekor/muvaffaqiyatsiz bo'lgan ref — keyingi ref bilan yangi urinish
        }
        if (lk.found === false && code !== 'duplicate_external_ref') {
          // buyurtma yaratilmagan: keyingi tick'da shu ref bilan qayta urinadi
          return { ok: false, state: 'error', error: errMsg(r) };
        }
        return { ok: false, state: 'error', error: lk.error || errMsg(r) };
      }

      if (code === 'price_changed' || code === 'item_unavailable' || code === 'asset_mismatch') {
        lastError = errMsg(r);
        break; // keyingi nomzod listing
      }

      // insufficient_balance, partner_blocked, too_many_active_trades, invalid_tradeurl, 401/403 ...
      return {
        ok: false,
        state: 'error',
        error: code === 'insufficient_balance' ? "cs2shop balansida mablag' yetarli emas — balansni to'ldiring" : errMsg(r),
      };
    }
  }
  return { ok: false, state: 'error', error: lastError };
}

export async function status(providerRef) {
  const lk = await lookup(providerRef);
  if (lk.found) {
    const m = mapTrade(lk.trade);
    return { state: m.state, detail: m.detail, ...(m.error ? { error: m.error } : {}) };
  }
  if (lk.found === false) return { state: 'error', error: 'cs2shop: buyurtma topilmadi' };
  return { state: 'processing', error: lk.error };
}

// Merchant balansi (USD) — admin ogohlantirish uchun
export async function balance() {
  const r = await api('GET', '/v1/merchant/wallet');
  if (r.status !== 200 || !r.data) throw new Error(errMsg(r));
  return { balance: Number(r.data.balance) || 0, available: Number(r.data.total_available) || 0 };
}

// Webhook imzosi: hex HMAC-SHA256(rawBody, apiKey)
export function verifyWebhook(rawBody, signature) {
  const key = apiKey();
  if (!key || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', key).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
