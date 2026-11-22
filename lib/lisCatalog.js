// LIS-SKINS katalogi (nom darajasida) — ochiq "qisqa ro'yxat" (parolsiz, ~0.5 MB, ~27k nom):
//   https://lis-skins.com/market_export_json/csgo.json
//   [{ name, price (eng arzon, qulfli ham), unlocked_price (eng arzon QULFSIZ), url, count }]
// Katalog narxi = qulfsiz eng arzon narx (lib/pricing.js: cost rejimida aynan shu narx).
// Sotib olish paytida aniq skin lib/fulfill/lis.js orqali qidiriladi (qulfsiz, narx limiti bilan).
//
// SKINS_SOURCE=lis bo'lsa lib/skinportFeed.js shu modulni ishlatadi.

import { sellPrice } from './pricing';
import { getPriceOverrides } from './priceOverrides';
import { gzipSync, gunzipSync } from 'node:zlib';
import { kvEnabled, kvGet, kvSet } from './kv';
import { waitUntil } from '@vercel/functions';

const URL_ = process.env.LIS_SKINS_FEED_URL || 'https://lis-skins.com/market_export_json/csgo.json';

let etag = null;
let last = null;

// Qisqa ro'yxat (ETag bilan; 304 bo'lsa oldingisi)
export async function fetchLisShortList() {
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 oxy-savdo' };
  if (etag && last) headers['If-None-Match'] = etag;
  let res;
  try {
    res = await fetch(URL_, { headers, cache: 'no-store', signal: AbortSignal.timeout(25000) });
  } catch (e) {
    if (last) return last; // tarmoq xatosi — oxirgi yaxshi ro'yxat
    const err = new Error('lis_feed_failed');
    err.code = 'fetch_failed';
    err.detail = e?.name === 'TimeoutError' ? 'timeout (25s)' : e?.message || String(e);
    throw err;
  }
  if (res.status === 304 && last) return last;
  if (!res.ok) {
    if (last) return last;
    const err = new Error('lis_feed_failed');
    err.code = 'fetch_failed';
    err.status = res.status;
    err.detail = `LIS ro'yxati HTTP ${res.status}`;
    throw err;
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (last) return last;
    const err = new Error('lis_feed_failed');
    err.code = 'fetch_failed';
    err.detail = "JSON o'qib bo'lmadi: " + (e?.message || e);
    throw err;
  }
  last = Array.isArray(data) ? data : [];
  etag = res.headers.get('etag') || null;
  return last;
}

// -> Skinport feed shakli: { market_hash_name, min_price (SOTUV narxi, USD), quantity, costUsd }
export function aggregateLis(list, overrides = {}) {
  const out = [];
  for (const it of list) {
    const name = it?.name;
    const cost = Number(it?.unlocked_price);
    if (!name || !(cost > 0)) continue; // qulfsiz nusxa yo'q — sotib bo'lmaydi
    const p = sellPrice({ costUsd: cost, marketHashName: name }, overrides);
    out.push({
      market_hash_name: name,
      min_price: p.sellUsd,
      quantity: Number(it.count) || 0,
      costUsd: cost,
    });
  }
  return out;
}

// Ixcham umumiy kesh (KV): faqat kerakli maydonlar [nom, qulfsiz narx, soni], gzip+base64 (~0.3 MB).
// Bir instance yangilasa, qolgan barcha instancelar tayyorini oladi (5 MB ro'yxatni qayta yuklamaydi).
const SLIM_KEY = 'oxy:lis_slim';
const SLIM_TTL = 5 * 60 * 1000;

async function readSlim() {
  if (!kvEnabled) return null;
  try {
    const raw = await kvGet(SLIM_KEY);
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!v?.z || Date.now() - (v.ts || 0) > SLIM_TTL) return null;
    const rows = JSON.parse(gunzipSync(Buffer.from(v.z, 'base64')).toString('utf8'));
    return rows.map(([name, unlocked_price, count]) => ({ name, unlocked_price, count }));
  } catch {
    return null;
  }
}

async function writeSlim(list) {
  if (!kvEnabled) return;
  try {
    const rows = list.filter((e) => e?.name && Number(e.unlocked_price) > 0).map((e) => [e.name, Number(e.unlocked_price), Number(e.count) || 0]);
    const z = gzipSync(Buffer.from(JSON.stringify(rows))).toString('base64');
    await kvSet(SLIM_KEY, JSON.stringify({ ts: Date.now(), z }));
  } catch {
    /* kesh yozilmasa ham ishlaydi */
  }
}

export async function fetchLisAggregated() {
  const overridesP = getPriceOverrides();
  let list = await readSlim();
  if (!list) {
    list = await fetchLisShortList();
    const w = writeSlim(list); // javobni kutdirmaymiz, lekin funksiya yozib bo'lguncha tirik turadi
    try {
      waitUntil(w);
    } catch {
      /* waitUntil yo'q muhit */
    }
  }
  return aggregateLis(list, await overridesP);
}
