// Waxpeer API — skin sotib olish + P2P yetkazish.
// Hujjat: https://docs.waxpeer.com
//
// .env.local:
//   WAXPEER_API_KEY
//
// Oqim: nom bo'yicha listing qidirish -> eng arzonini `buy-one-p2p` bilan
// sotib olish (game=csgo). Holat: `check-many-project-id`.

const API = 'https://api.waxpeer.com/v1';
const KEY = process.env.WAXPEER_API_KEY || '';

export const id = 'waxpeer';

export function configured() {
  return Boolean(KEY);
}

async function get(path, params = {}) {
  const q = new URLSearchParams({ api: KEY, ...params });
  const res = await fetch(`${API}${path}?${q}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.msg || data.error || `Waxpeer ${path} HTTP ${res.status}`);
  }
  return data;
}

// { marketHashName, maxPriceUSD, tradeUrl, partner, token, customId }
export async function buy({ marketHashName, maxPriceUSD, token, partner, customId }) {
  try {
    // 1) nom bo'yicha arzon listingni topamiz (narx Waxpeer'da "units": USD*1000)
    const search = await get('/search-items-by-name', {
      game: 'csgo',
      names: marketHashName,
    });
    const items = search.items || [];
    const maxUnits = Math.round(Number(maxPriceUSD || 0) * 1000);
    const pick = items
      .filter((i) => !maxUnits || Number(i.price) <= maxUnits)
      .sort((a, b) => Number(a.price) - Number(b.price))[0];
    if (!pick) return { ok: false, error: 'Waxpeer: mos listing topilmadi', state: 'error' };

    // 2) sotib olish (P2P)
    const res = await get('/buy-one-p2p', {
      item_id: pick.item_id,
      price: pick.price,
      token,
      partner,
      project_id: customId,
    });
    return {
      ok: true,
      providerRef: String(res.id ?? res.trade_id ?? pick.item_id),
      state: 'processing',
      detail: res.msg || null,
    };
  } catch (e) {
    return { ok: false, error: e.message, state: 'error' };
  }
}

export async function status(providerRef) {
  try {
    const data = await get('/check-many-project-id', { id: providerRef });
    const t = (data.trades || [])[0] || {};
    const s = String(t.status || t.trade_state || '').toLowerCase();
    let state = 'processing';
    if (['sent', 'active', 'waiting'].includes(s)) state = 'sent';
    else if (['accepted', 'done', 'completed', 'success'].includes(s)) state = 'done';
    else if (['declined', 'error', 'cancelled', 'canceled', 'expired'].includes(s)) state = 'error';
    return { state, detail: s || null };
  } catch (e) {
    return { state: 'processing', error: e.message };
  }
}
