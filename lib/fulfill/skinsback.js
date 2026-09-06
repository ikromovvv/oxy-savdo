// Skinsback B2B — skin sotib olish + yetkazish.
// Hujjat: skinsback.com (B2B / merchant API).
//
// .env.local:
//   SKINSBACK_SHOP_ID, SKINSBACK_SECRET, (ixtiyoriy) SKINSBACK_API_URL
//
// Barcha so'rovlar imzolanadi: signature = md5( <param1=val1&...> + secret )
// (aniq imzo tartibi — Skinsback hujjatiga qarab moslashtiring).

import crypto from 'crypto';

const API = (process.env.SKINSBACK_API_URL || 'https://skinsback.com/api.php').replace(/\/+$/, '');
const SHOP_ID = process.env.SKINSBACK_SHOP_ID || '';
const SECRET = process.env.SKINSBACK_SECRET || '';

export const id = 'skinsback';

export function configured() {
  return Boolean(SHOP_ID && SECRET);
}

function sign(params) {
  const keys = Object.keys(params).sort();
  const base = keys.map((k) => `${k}:${params[k]}`).join(';');
  return crypto.createHash('md5').update(base + SECRET, 'utf8').digest('hex');
}

async function call(method, params = {}) {
  const payload = { shopid: SHOP_ID, method, ...params };
  payload.sign = sign(payload);
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || data.error || `Skinsback ${method} HTTP ${res.status}`);
  }
  return data;
}

// Bitta skinni sotib olib, xaridor trade URL'iga yuboradi.
// { marketHashName, maxPriceUSD, tradeUrl, partner, token, customId }
export async function buy({ marketHashName, maxPriceUSD, tradeUrl, customId }) {
  try {
    const data = await call('market_buy', {
      name: marketHashName,
      max_price: Number(maxPriceUSD || 0).toFixed(2),
      partner_trade_link: tradeUrl,
      custom_id: customId,
    });
    return {
      ok: true,
      providerRef: String(data.buy_id ?? data.id ?? data.transaction_id ?? customId),
      state: 'processing',
      detail: data.message || null,
    };
  } catch (e) {
    return { ok: false, error: e.message, state: 'error' };
  }
}

// providerRef bo'yicha yetkazish holati
export async function status(providerRef) {
  try {
    const data = await call('market_status', { buy_id: providerRef });
    // Skinsback holatlarini bizning holatlarga moslashtiramiz
    const s = String(data.state || data.status || '').toLowerCase();
    let state = 'processing';
    if (['sent', 'trade_sent', 'waiting_accept'].includes(s)) state = 'sent';
    else if (['done', 'success', 'accepted', 'completed'].includes(s)) state = 'done';
    else if (['error', 'failed', 'canceled', 'cancelled', 'declined'].includes(s)) state = 'error';
    return { state, detail: data.message || s || null };
  } catch (e) {
    return { state: 'processing', error: e.message };
  }
}
