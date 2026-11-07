// Qo'lda narx belgilash (overrides): market_hash_name yoki listingId bo'yicha
//   { addUsd?: number, fixedUsd?: number }
// Saqlash: KV (prod) yoki data/price-overrides.json (lokal). Kichik xotira keshi bilan.

import fs from 'node:fs/promises';
import path from 'node:path';
import { kvEnabled, kvGet, kvSet } from './kv';

const KV_KEY = 'oxy:price_overrides';
const FILE = () => path.join(process.cwd(), 'data', 'price-overrides.json');
const TTL = 60 * 1000;

let cache = { map: null, ts: 0 };

function clean(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
    const addUsd = Number(v?.addUsd);
    const fixedUsd = Number(v?.fixedUsd);
    const e = {};
    if (Number.isFinite(addUsd) && addUsd !== 0) e.addUsd = Math.round(addUsd * 100) / 100;
    if (Number.isFinite(fixedUsd) && fixedUsd > 0) e.fixedUsd = Math.round(fixedUsd * 100) / 100;
    if (k && (e.addUsd || e.fixedUsd)) out[String(k)] = e;
  }
  return out;
}

export async function getPriceOverrides() {
  if (cache.map && Date.now() - cache.ts < TTL) return cache.map;
  let map = {};
  try {
    if (kvEnabled) {
      const raw = await kvGet(KV_KEY);
      map = clean(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } else {
      map = clean(JSON.parse(await fs.readFile(FILE(), 'utf8')));
    }
  } catch {
    // fayl/kalit yo'q yoki o'qib bo'lmadi — override'siz davom etamiz
  }
  cache = { map, ts: Date.now() };
  return map;
}

// key uchun override'ni o'rnatadi; {} / null bo'lsa o'chiradi
export async function setPriceOverride(key, value) {
  const map = { ...(await getPriceOverrides()) };
  const cleaned = clean({ [key]: value })[key];
  if (cleaned) map[key] = cleaned;
  else delete map[key];

  if (kvEnabled) await kvSet(KV_KEY, JSON.stringify(map));
  else {
    await fs.mkdir(path.dirname(FILE()), { recursive: true });
    await fs.writeFile(FILE(), JSON.stringify(map, null, 2));
  }
  cache = { map, ts: Date.now() };
  return map;
}
