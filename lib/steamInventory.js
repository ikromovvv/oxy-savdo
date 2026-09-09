// Steam'dagi ommaviy inventarni olish (CS2, appid 730). Narxlar Steam bozor
// "priceoverview" endpointidan EMAS (u har IP uchun juda tez 429 beradi va
// hatto inventar so'rovini ham bloklab qo'yadi) — Skinport public API'sidan
// olinadi (lib/skinportFeed.getSkinportPriceMap, bitta so'rov + kesh).

import { getSkinportPriceMap } from './skinportFeed';

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

// Inventar javobini instans xotirasida qisqa muddat keshlaymiz — sahifa
// qayta yuklanganda Steam'ga qayta-qayta so'rov yubormaslik uchun.
const invCache = new Map(); // steamid -> { items, ts }
const INV_TTL = 3 * 60 * 1000;

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

// Foydalanuvchi inventarini narxlar (Skinport, USD) bilan birga qaytaradi.
export async function getInventoryWithPrices(steamid) {
  const cached = invCache.get(steamid);
  if (cached && Date.now() - cached.ts < INV_TTL) return cached.items;

  let raw;
  try {
    raw = await fetchInventoryRaw(steamid);
  } catch (e) {
    // Steam vaqtincha bloklagan bo'lsa — bor bo'lsa eski keshni beramiz
    if (e.code === 'rate_limited' && cached) return cached.items;
    throw e;
  }

  const items = parseInventory(raw);

  let priceMap = new Map();
  try {
    priceMap = await getSkinportPriceMap();
  } catch {
    /* narxsiz ham inventarni ko'rsatamiz */
  }

  const withPrices = items.map((it) => ({
    ...it,
    price: it.marketable ? (priceMap.get(it.marketHashName) ?? undefined) : null,
  }));

  invCache.set(steamid, { items: withPrices, ts: Date.now() });
  return withPrices;
}
