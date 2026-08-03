// Steam'dagi ommaviy inventar va bozor narxlarini olish (CS2, appid 730).
// API kalit talab qilinmaydi — inventar va narx endpointlari ochiq (public).

const APPID = 730;
const CONTEXTID = 2;

const EXTERIOR_SHORT = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

export function exteriorShort(exterior) {
  return EXTERIOR_SHORT[exterior] || '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Narxlarni serverda vaqtinchalik keshlab qo'yamiz — Steam bozorini haddan
// tashqari ko'p so'rov bilan bloklab qo'ymaslik uchun.
const priceCache = new Map(); // market_hash_name -> { price, ts }
const PRICE_TTL = 10 * 60 * 1000;

export async function fetchInventoryRaw(steamid) {
  // SteamID64 har doim 17 xonali raqam. Boshqa formatda bo'lsa Steam 400 qaytaradi.
  if (!/^\d{17}$/.test(String(steamid || ''))) {
    console.error('[steamInventory] noto\'g\'ri steamid formati:', steamid);
    const err = new Error('invalid_steamid');
    err.code = 'invalid_steamid';
    err.detail = `steamid: ${steamid}`;
    throw err;
  }

  const url = `https://steamcommunity.com/inventory/${steamid}/${APPID}/${CONTEXTID}?l=english&count=2000`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: `https://steamcommunity.com/profiles/${steamid}/inventory`,
      },
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[steamInventory] tarmoq xatosi:', e?.message || e);
    const err = new Error('network_error');
    err.code = 'network_error';
    throw err;
  }

  if (res.status === 403) {
    const err = new Error('private');
    err.code = 'private';
    throw err;
  }
  if (res.status === 429) {
    console.error('[steamInventory] Steam 429 (rate limit) qaytardi');
    const err = new Error('rate_limited');
    err.code = 'rate_limited';
    throw err;
  }
  // Steam ko'pincha inventar "Public" emas (masalan "Friends Only" yoki hali
  // hech qachon ochilmagan) bo'lganda ham 403 emas, 400 va tanasida "null"
  // qaytaradi — buni ham "yopiq inventar" holati sifatida ko'ramiz.
  if (res.status === 400) {
    const bodyText = await res.text().catch(() => '');
    console.error(`[steamInventory] HTTP 400 (ehtimol inventar Public emas) — steamid=${steamid} — ${bodyText.slice(0, 200)}`);
    const err = new Error('private');
    err.code = 'private';
    err.detail = `HTTP 400 — ${bodyText.slice(0, 200)}`;
    throw err;
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const detail = `HTTP ${res.status} ${res.statusText || ''} — steamid=${steamid} — ${bodyText.slice(
      0,
      300
    )}`.trim();
    console.error(`[steamInventory] inventar so'rovi muvaffaqiyatsiz: ${detail}`);
    const err = new Error('fetch_failed');
    err.code = 'fetch_failed';
    err.status = res.status;
    err.detail = detail;
    throw err;
  }

  const bodyText = await res.text();
  let data = null;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    console.error('[steamInventory] JSON parse xatosi:', e?.message || e, '— javob:', bodyText.slice(0, 300));
    const err = new Error('fetch_failed');
    err.code = 'fetch_failed';
    err.detail = `JSON parse xatosi — javob: ${bodyText.slice(0, 300)}`;
    throw err;
  }

  if (!data || data.success === false || !Array.isArray(data.assets)) {
    // Steam ba'zan inventar bo'sh yoki yopiq bo'lganda ham success:false yoki
    // assets'siz javob qaytaradi — buni "private/empty" deb ko'ramiz.
    console.error('[steamInventory] inventar bo\'sh yoki yopiq (data):', JSON.stringify(data)?.slice(0, 300));
    const err = new Error('private');
    err.code = 'private';
    err.detail = `data: ${JSON.stringify(data)?.slice(0, 300)}`;
    throw err;
  }
  return data;
}

export function parseInventory(data) {
  const descByKey = new Map();
  for (const d of data.descriptions || []) {
    descByKey.set(`${d.classid}_${d.instanceid || '0'}`, d);
  }

  const items = [];
  for (const a of data.assets || []) {
    const key = `${a.classid}_${a.instanceid || '0'}`;
    const d = descByKey.get(key);
    if (!d) continue;

    const exteriorTag = (d.tags || []).find((tag) => tag.category === 'Exterior');
    const typeTag = (d.tags || []).find((tag) => tag.category === 'Type');

    items.push({
      assetid: a.assetid,
      classid: a.classid,
      instanceid: a.instanceid || '0',
      name: d.market_name || d.name || 'Skin',
      marketHashName: d.market_hash_name || d.market_name || d.name,
      icon: d.icon_url
        ? `https://community.cloudflare.steamstatic.com/economy/image/${d.icon_url}/330x192`
        : '',
      exterior: exteriorTag ? exteriorTag.localized_tag_name : '',
      type: typeTag ? typeTag.localized_tag_name : '',
      tradable: !!d.tradable,
      marketable: !!d.marketable,
    });
  }
  return items;
}

async function fetchPrice(marketHashName) {
  const cached = priceCache.get(marketHashName);
  if (cached && Date.now() - cached.ts < PRICE_TTL) return cached.price;

  try {
    const url = `https://steamcommunity.com/market/priceoverview/?appid=${APPID}&currency=1&market_hash_name=${encodeURIComponent(
      marketHashName
    )}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      cache: 'no-store',
    });
    if (!res.ok) {
      priceCache.set(marketHashName, { price: null, ts: Date.now() });
      return null;
    }
    const data = await res.json().catch(() => null);
    const raw = data?.lowest_price || data?.median_price;
    const price = raw ? parseFloat(String(raw).replace(/[^0-9.,]/g, '').replace(',', '.')) : null;
    const value = Number.isFinite(price) ? price : null;
    priceCache.set(marketHashName, { price: value, ts: Date.now() });
    return value;
  } catch {
    priceCache.set(marketHashName, { price: null, ts: Date.now() });
    return null;
  }
}

// Bir nechta skin narxini cheklangan parallellik bilan olib kelamiz
// (Steam bozor API'si tez-tez so'rov yuborilsa 429 bilan bloklaydi).
async function fetchPricesForNames(names, concurrency = 5, gapMs = 200) {
  const result = new Map();
  let i = 0;

  async function worker() {
    while (i < names.length) {
      const idx = i++;
      const name = names[idx];
      const price = await fetchPrice(name);
      result.set(name, price);
      await sleep(gapMs);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, names.length) || 1 }, worker);
  await Promise.all(workers);
  return result;
}

// Foydalanuvchi inventarini narxlar bilan birga qaytaradi.
// Juda katta inventarlarda javob vaqtini cheklash uchun noyob nomlar soni cheklanadi.
const MAX_PRICE_LOOKUPS = 150;

export async function getInventoryWithPrices(steamid) {
  const raw = await fetchInventoryRaw(steamid);
  const items = parseInventory(raw);

  const uniqueNames = [...new Set(items.filter((i) => i.marketable).map((i) => i.marketHashName))].slice(
    0,
    MAX_PRICE_LOOKUPS
  );
  const priceMap = await fetchPricesForNames(uniqueNames);

  return items.map((it) => ({
    ...it,
    price: priceMap.has(it.marketHashName) ? priceMap.get(it.marketHashName) : it.marketable ? undefined : null,
  }));
}
