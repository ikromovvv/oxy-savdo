// LIS-SKINS Public User API — skin sotib olish + xaridorga Steam trade offer.
// Hujjat: https://lis-skins.stoplight.io/docs/lis-skins/dzq78x3edc19r-api-overview
//
// Vercel env:
//   LIS_SKINS_API_KEY            (lis-skins.com/profile/api; balans $100 dan oshganda beriladi)
//   LIS_SKINS_MIN_MARGIN_USD=0.5 (markup rejimida: sotuv narxidan shuncha past tannarxdan qimmat olmaymiz)
//
// Oqim: nom bo'yicha QULFSIZ (only_unlocked) eng arzon skinni qidirish -> POST /v1/market/buy
//   (ids, partner, token, max_price, custom_id) -> LIS boti xaridorga trade offer yuboradi.
// Holat: GET /v1/market/info?custom_ids[]=... (providerRef = custom_id).
//
// Idempotentlik: har buyurtma elementi uchun BITTA custom_id. Buyurtma oldin yaratilgan bo'lsa
// (timeout / 5xx dan keyin) qayta sotib OLINMAYDI — avval info orqali tekshiriladi.
// `return` holatiga tushgan (qaytarilgan, pul balansga qaytgan) custom_id qayta ishlatilmaydi:
// yangi urinish `~2`, `~3` qo'shimchali custom_id bilan.
//
// Statuslar (hujjat + misollar): processing -> wait_accept (offer yuborildi) -> yakun;
//   wait_unlock / wait_withdraw (qulf; qulfsiz sotib olinsa bo'lmaydi); return (qaytarildi, return_reason).
//   Yakunlangan holat nomi hujjatda ko'rsatilmagan: `return` bo'lmagan va steam_trade_offer_finished_at
//   to'ldirilgan bo'lsa — yakunlangan deb hisoblaymiz.

import { pricingMode } from '../pricing';

export const id = 'lis';

const BASE = process.env.LIS_SKINS_API_URL || 'https://api.lis-skins.com';
const TIMEOUT_MS = 15000;
const MAX_REF_ATTEMPTS = 6;
const MAX_CANDIDATES = 3;

const apiKey = () => process.env.LIS_SKINS_API_KEY || '';
const minMargin = () => {
  const v = Number(process.env.LIS_SKINS_MIN_MARGIN_USD);
  return Number.isFinite(v) && v >= 0 ? v : 0.5;
};

export function configured() {
  return Boolean(apiKey());
}

// -> { status, data }. Tarmoq xatosi/timeout: { status: 0, data: null, networkError }
async function api(method, path, { query, body } = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(query || {})) {
    if (Array.isArray(v)) for (const x of v) url.searchParams.append(k, String(x));
    else url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey()}`,
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

const errMsg = (r) => {
  if (r.networkError) return `LIS tarmoq xatosi: ${r.networkError}`;
  const m = r.data?.message || r.data?.error;
  const detail = typeof m === 'string' ? m : m ? JSON.stringify(m) : '';
  return `LIS HTTP ${r.status}${detail ? ': ' + detail.slice(0, 200) : ''}`;
};

// skin (purchase.skins[0]) -> { state, detail, error, final? }
export function mapSkin(s) {
  const st = String(s?.status || '').toLowerCase();
  if (st === 'processing') return { state: 'processing', detail: st };
  if (st === 'wait_accept') return { state: 'sent', detail: st };
  if (st === 'wait_unlock') return { state: 'processing', detail: st };
  if (st === 'wait_withdraw') return { state: 'processing', detail: st, needsWithdraw: true };
  if (st === 'return') {
    return {
      state: 'error',
      detail: st,
      error: `LIS: qaytarildi (${s?.return_reason || 'sabab nomaʼlum'})${s?.error ? ' — ' + s.error : ''}`,
      retryable: true,
    };
  }
  if (s?.error) return { state: 'error', detail: st, error: `LIS: ${s.error}`, retryable: true };
  // yakunlangan holat nomi hujjatda yo'q: trade tugagan va qaytarilmagan bo'lsa — done
  if (s?.steam_trade_offer_finished_at) return { state: 'done', detail: st || 'finished' };
  return { state: st ? 'sent' : 'processing', detail: st || null };
}

// purchase (bir nechta skin bo'lishi mumkin) -> umumiy holat
export function mapPurchase(p) {
  const skins = p?.skins || [];
  if (!skins.length) return { state: 'processing', detail: null };
  const maps = skins.map(mapSkin);
  const err = maps.find((m) => m.state === 'error');
  if (err) return err;
  if (maps.every((m) => m.state === 'done')) return { state: 'done', detail: maps[0].detail };
  if (maps.some((m) => m.needsWithdraw)) return { state: 'processing', detail: 'wait_withdraw', needsWithdraw: true };
  if (maps.every((m) => m.state === 'sent' || m.state === 'done')) return { state: 'sent', detail: maps[0].detail };
  return { state: 'processing', detail: maps[0].detail };
}

// custom_id bo'yicha buyurtma: { found:true, purchase } | { found:false } | { found:null, error }
async function lookup(customId) {
  const r = await api('GET', '/v1/market/info', { query: { 'custom_ids[]': [customId] } });
  if (r.status === 200 && r.data) {
    const p = (r.data.data || []).find((x) => x.custom_id === customId) || (r.data.data || [])[0];
    return p ? { found: true, purchase: p } : { found: false };
  }
  if (r.status === 404) return { found: false };
  return { found: null, error: errMsg(r) };
}

// Nom bo'yicha qulfsiz nomzod skinlar (arzondan qimmatga), narx <= cap
async function findCandidates(marketHashName, cap) {
  const r = await api('GET', '/v1/market/search', {
    query: { game: 'csgo', 'names[]': [marketHashName], only_unlocked: 1, sort_by: 'lowest_price' },
  });
  if (r.status !== 200 || !r.data) throw new Error(errMsg(r));
  const all = (r.data.data || [])
    .filter((s) => s.name === marketHashName && !s.unlock_at)
    .sort((a, b) => Number(a.price) - Number(b.price));
  return { all: all.length, list: all.filter((s) => !cap || Number(s.price) <= cap).slice(0, MAX_CANDIDATES) };
}

// { marketHashName, listingId?, maxPriceUSD, salePriceUSD?, tradeUrl, partner, token, customId }
export async function buy({ marketHashName, listingId, maxPriceUSD, salePriceUSD, partner, token, customId }) {
  if (!configured()) return { ok: false, error: 'LIS-SKINS sozlanmagan', state: 'error' };
  if (!partner || !token) return { ok: false, error: "Trade URL noto'g'ri (partner/token yo'q)", state: 'error' };

  const sale = Number(salePriceUSD) || 0;
  // cost rejimi: limit = maxPriceUSD (sotuv + tolerans); markup rejimi: sotuv narxidan marja ayiriladi
  const cap =
    pricingMode() === 'cost'
      ? Number(maxPriceUSD) || sale
      : sale > 0
        ? Math.max(0, sale - minMargin())
        : Number(maxPriceUSD) || 0;

  // Nomzodlar
  let candidates;
  try {
    if (listingId) {
      candidates = { all: 1, list: [{ id: Number(listingId), price: cap || undefined }] };
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
        ? `LIS: "${marketHashName}" narxi oshib ketdi (limit $${cap.toFixed(2)})`
        : `LIS: "${marketHashName}" qulfsiz holatda mavjud emas`,
    };
  }

  let lastError = "LIS: sotib olib bo'lmadi";
  for (const cand of candidates.list) {
    for (let attempt = 1; attempt <= MAX_REF_ATTEMPTS; attempt++) {
      const ref = attempt === 1 ? customId : `${customId}~${attempt}`;

      // Bu ref bilan buyurtma allaqachon bormi? (qayta sotib olmaslik)
      const lk = await lookup(ref);
      if (lk.found) {
        const m = mapPurchase(lk.purchase);
        if (m.state === 'error' && m.retryable) continue; // qaytarilgan — yangi ref bilan
        if (m.state === 'error') return { ok: false, state: 'error', error: m.error };
        return { ok: true, providerRef: ref, ...m };
      }
      if (lk.found === null) return { ok: false, state: 'error', error: lk.error };

      const r = await api('POST', '/v1/market/buy', {
        body: {
          ids: [cand.id],
          partner: String(partner),
          token: String(token),
          ...(cap > 0 ? { max_price: Math.round(cap * 100) / 100 } : {}),
          custom_id: ref,
        },
      });

      if (r.status === 200 && r.data?.data) {
        const p = r.data.data;
        return { ok: true, providerRef: ref, ...mapPurchase(p), detail: `LIS ${p.skins?.[0]?.status || 'ok'} #${p.purchase_id}` };
      }

      // timeout / 5xx: buyurtma yaratilgan bo'lishi mumkin — info orqali tekshiramiz
      if (r.status === 0 || r.status >= 500) {
        const again = await lookup(ref);
        if (again.found) return { ok: true, providerRef: ref, ...mapPurchase(again.purchase) };
        return { ok: false, state: 'error', error: errMsg(r) };
      }

      // 400/422: skin sotilib ketgan, narx oshgan, balans yetarli emas ...
      lastError = errMsg(r);
      const msg = JSON.stringify(r.data || {}).toLowerCase();
      if (/balance|insufficient|not enough|funds/.test(msg)) {
        return { ok: false, state: 'error', error: "LIS balansida mablag' yetarli emas — balansni to'ldiring" };
      }
      break; // keyingi nomzod skin
    }
  }
  return { ok: false, state: 'error', error: lastError };
}

export async function status(providerRef) {
  const lk = await lookup(providerRef);
  if (lk.found) {
    const m = mapPurchase(lk.purchase);
    // Qulf tugagan skin: 12 soat ichida withdraw qilish kerak (qulfsiz sotib olinsa bu bo'lmaydi)
    if (m.needsWithdraw) {
      await api('POST', '/v1/market/withdraw', { body: { custom_id: providerRef } }).catch(() => {});
    }
    return { state: m.state, detail: m.detail, ...(m.error ? { error: m.error } : {}) };
  }
  if (lk.found === false) return { state: 'error', error: 'LIS: buyurtma topilmadi' };
  return { state: 'processing', error: lk.error };
}

// Balans (USD)
export async function balance() {
  const r = await api('GET', '/v1/user/balance');
  if (r.status !== 200 || !r.data?.data) throw new Error(errMsg(r));
  const b = Number(r.data.data.balance) || 0;
  return { balance: b, available: b, frozen: 0 };
}

// Xaridlar tarixi (admin paneli): { purchases, total }
export async function purchaseHistory({ page = 1 } = {}) {
  const r = await api('GET', '/v1/market/history', { query: { page } });
  if (r.status !== 200 || !r.data) throw new Error(errMsg(r));
  return { purchases: r.data.data || [], total: Number(r.data.meta?.total) || 0, lastPage: Number(r.data.meta?.last_page) || 1 };
}

// Qulfsiz eng arzon skinlar (admin test savdo uchun)
export async function cheapestUnlocked({ maxPriceUsd = 1, limit = 20 } = {}) {
  const r = await api('GET', '/v1/market/search', {
    query: { game: 'csgo', only_unlocked: 1, sort_by: 'lowest_price', price_to: maxPriceUsd },
  });
  if (r.status !== 200 || !r.data) throw new Error(errMsg(r));
  return (r.data.data || [])
    .filter((s) => String(s.name || '').includes(' | ') && !s.unlock_at && Number(s.price) > 0)
    .slice(0, limit);
}
