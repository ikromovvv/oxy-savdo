// CS2 skinlar uchun metama'lumot (asl Steam rasmi + rariteti + float oralig'i).
//
// Manba: ochiq CSGO-API (github.com/ByMykel/CSGO-API). Uning skins.json fayli ~5 MB —
// har "sovuq" serverless instance'da uni yuklash 1.5–5 soniya qo'shardi. Shuning uchun asosiy
// ma'lumot lib/skinMetaData.json ichida (ixcham, ~0.6 MB, kod bilan birga keladi) — darhol tayyor.
// Yangilash:  node scripts/gen-skin-meta.mjs   (yangi skinlar chiqqanda, masalan oyda bir marta).
// Faylda yo'q nom so'ralsa, jonli manba bir marta yuklanadi (1.5 s gacha kutiladi, keyin instance keshida).

import STATIC from './skinMetaData.json';

const FEED_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 soat
const REMOTE_WAIT_MS = 1500;

let remote = { map: null, ts: 0 };
let inflight = null;

function normalize(name) {
  return String(name || '')
    .replace(/^★\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Doppler fazalari (Phase 1-4, Ruby, Sapphire, Black Pearl, Emerald) CSGO-API'da alohida nom emas — umumiy "Doppler" rasmi ishlatiladi
const PHASE_RE = /\s+(Phase\s*\d|Ruby|Sapphire|Black Pearl|Emerald)$/i;
const lookupStatic = (n) => STATIC[normalize(n)] || STATIC[normalize(String(n).replace(PHASE_RE, ''))];

const fromRow = (r) => ({
  image: r[0] || null,
  rarity: r[1] || null, // "Covert", "Mil-Spec Grade", ...
  rarityColor: r[2] || null, // "#eb4b4b"
  minFloat: typeof r[3] === 'number' ? r[3] : null,
  maxFloat: typeof r[4] === 'number' ? r[4] : null,
});

async function loadRemote() {
  if (remote.map && Date.now() - remote.ts < CACHE_TTL) return remote.map;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(FEED_URL, { cache: 'no-store' });
    if (!res.ok) {
      const err = new Error('skin_images_fetch_failed');
      err.status = res.status;
      throw err;
    }
    const list = await res.json();
    const map = new Map();
    for (const item of list) {
      if (!item?.name) continue;
      const key = normalize(item.name);
      if (map.has(key)) continue; // bir xil nomdan birinchisi
      map.set(key, [
        item.image || '',
        item.rarity?.name || '',
        item.rarity?.color || '',
        typeof item.min_float === 'number' ? item.min_float : null,
        typeof item.max_float === 'number' ? item.max_float : null,
      ]);
    }
    remote = { map, ts: Date.now() };
    return map;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

// names: string[] -> { [name]: { image, rarity, rarityColor, minFloat, maxFloat } | null }
export async function getSkinMeta(names) {
  const out = {};
  const missing = [];
  for (const n of names) {
    const row = lookupStatic(n) || remote.map?.get(normalize(n));
    if (row) out[n] = fromRow(row);
    else missing.push(n);
  }
  if (missing.length && !remote.map) {
    // jonli manbani bir marta yuklashga urinamiz, lekin javobni uzoq kechiktirmaymiz
    const map = await Promise.race([
      loadRemote().catch(() => null),
      new Promise((r) => setTimeout(() => r(null), REMOTE_WAIT_MS)),
    ]);
    for (const n of missing) {
      const row = map?.get(normalize(n));
      if (row) out[n] = fromRow(row);
    }
  }
  for (const n of names) if (!(n in out)) out[n] = null;
  return out;
}

// names: string[] -> { [name]: imageUrl | null }  (eski API — moslik uchun)
export async function getSkinImages(names) {
  const meta = await getSkinMeta(names);
  const result = {};
  for (const n of names) result[n] = meta[n]?.image || null;
  return result;
}
