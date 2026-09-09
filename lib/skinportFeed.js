// Skinport public API orqali CS2 skin katalogi.
// GET https://api.skinport.com/v1/items?app_id=730&currency=USD
//  - Bepul, kalitsiz.
//  - Rate limit ~8 so'rov / 5 daqiqa -> butun ro'yxatni bir marta olib,
//    xotirada + KV'da 30 daqiqa keshlaymiz (barcha serverless instancelar
//    uchun bitta so'rov).
//  - Javob: { market_hash_name, min_price, suggested_price, quantity, ... }
//    Rasm / rariteti / float oralig'i — /api/skins route'ida CSGO-API
//    (getSkinMeta) dan qo'shiladi.
//
// Eski lib/lisSkinsFeed.js (LIS-SKINS to'liq eksporti) Vercel'da OOM berardi —
// shu modul uni almashtiradi.

import { kvEnabled, kvGet, kvSet } from './kv';

const API_URL = 'https://api.skinport.com/v1/items';
const APP_ID = 730;
const CURRENCY = 'USD';
const CACHE_TTL = 30 * 60 * 1000; // 30 daqiqa
const KV_KEY = 'oxy:skinport';

const USD_UZS =
  Number(process.env.USD_UZS) || Number(process.env.LIS_SKINS_PRICE_MULTIPLIER) || 12700;
const MAX_ITEMS = Number(process.env.SKINS_MAX_ITEMS) || 2000;

// Skinlar standart holda YOQILGAN. O'chirish uchun: SKINS_ENABLED=false
const SKINS_ENABLED = process.env.SKINS_ENABLED !== 'false';

// ---------------------------------------------------------------------------
// Nomdan qurol / naqsh / holatni ajratib olish (LIS-SKINS moduli bilan bir xil)
// ---------------------------------------------------------------------------

const CATEGORY_WEAPONS = {
  rifle: ['AK-47', 'M4A4', 'M4A1-S', 'Galil AR', 'FAMAS', 'AUG', 'SG 553'],
  sniper: ['AWP', 'SSG 08', 'SCAR-20', 'G3SG1'],
  pistol: [
    'Desert Eagle', 'Glock-18', 'USP-S', 'P250', 'Five-SeveN', 'Tec-9',
    'CZ75-Auto', 'P2000', 'R8 Revolver', 'Dual Berettas',
  ],
  smg: ['MP9', 'MAC-10', 'MP7', 'UMP-45', 'P90', 'PP-Bizon', 'MP5-SD'],
  heavy: ['Nova', 'XM1014', 'Sawed-Off', 'MAG-7', 'M249', 'Negev'],
};

const KNIFE_KEYWORDS = [
  'Karambit', 'Bayonet', 'Bowie Knife', 'Butterfly Knife', 'Falchion Knife',
  'Flip Knife', 'Gut Knife', 'Huntsman Knife', 'Navaja Knife', 'Nomad Knife',
  'Paracord Knife', 'Shadow Daggers', 'Skeleton Knife', 'Stiletto Knife',
  'Survival Knife', 'Talon Knife', 'Ursus Knife', 'Classic Knife', 'Kukri Knife',
];

const GLOVE_KEYWORDS = [
  'Hand Wraps', 'Driver Gloves', 'Specialist Gloves', 'Sport Gloves',
  'Moto Gloves', 'Hydra Gloves', 'Broken Fang Gloves', 'Bloodhound Gloves',
];

function classifyWeapon(weaponBase) {
  const clean = weaponBase.replace(/^★\s*/, '');
  for (const [slug, names] of Object.entries(CATEGORY_WEAPONS)) {
    if (names.includes(clean)) return slug;
  }
  if (weaponBase.startsWith('★')) {
    if (KNIFE_KEYWORDS.some((k) => clean.includes(k))) return 'knife';
    if (GLOVE_KEYWORDS.some((k) => clean.includes(k))) return 'gloves';
  }
  return null;
}

function parseSkinName(fullName) {
  let rest = String(fullName || '').trim();
  let stattrak = false;
  let souvenir = false;

  if (rest.startsWith('StatTrak™ ')) {
    stattrak = true;
    rest = rest.slice('StatTrak™ '.length);
  }
  if (rest.startsWith('Souvenir ')) {
    souvenir = true;
    rest = rest.slice('Souvenir '.length);
  }

  const m = rest.match(/^(.*?)\s*\|\s*(.*?)(?:\s*\(([^)]+)\))?$/);
  if (!m) return null;

  const weaponBase = m[1].trim();
  const skinName = m[2].trim();
  const wear = m[3] ? m[3].trim() : null;
  if (!weaponBase || !skinName) return null;

  return { weaponBase, skinName, wear, stattrak, souvenir };
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/™/g, '')
    .replace(/★/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Katalogni qurish (Skinport -> bizning shakl) + keshlash
// ---------------------------------------------------------------------------

let memCache = { items: null, weaponTypes: [], ts: 0 };
let inflight = null;

async function fetchSkinport() {
  // DIQQAT: Accept-Encoding'ni QO'LDA qo'ymaymiz — Node fetch (undici) o'zi
  // br/gzip so'raydi va ochadi. Qo'lda qo'ysak, ochilmagan bayt keladi.
  const res = await fetch(`${API_URL}?app_id=${APP_ID}&currency=${CURRENCY}&tradable=0`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = new Error('skinport_fetch_failed');
    err.code = res.status === 429 ? 'rate_limited' : 'fetch_failed';
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function toCatalog(raw) {
  const seen = new Set();
  const all = [];
  for (const it of raw) {
    const name = it.market_hash_name;
    if (!name) continue;

    const parsed = parseSkinName(name);
    if (!parsed) continue;

    const weaponType = classifyWeapon(parsed.weaponBase);
    if (!weaponType) continue;

    const id = slugify(name);
    if (!id || seen.has(id)) continue;

    const usd = Number(it.min_price ?? it.suggested_price ?? it.median_price ?? it.mean_price) || 0;
    if (usd <= 0) continue;

    seen.add(id);
    all.push({
      id,
      category: 'skins',
      weaponType,
      wear: parsed.wear || null,
      stattrak: parsed.stattrak,
      souvenir: parsed.souvenir,
      name: `${parsed.weaponBase} | ${parsed.skinName}`,
      fullName: name,
      price: Math.max(0, Math.round(usd * USD_UZS)),
      count: Number.isFinite(it.quantity) ? it.quantity : null,
    });
  }

  // Eng ko'p mavjud (quantity) skinlarni oldinga qo'yib, MAX_ITEMS ta olamiz —
  // shunda katalog haqiqiy, sotib olsa bo'ladigan skinlar bilan to'ladi.
  all.sort((a, b) => (b.count || 0) - (a.count || 0) || b.price - a.price);
  const items = all.slice(0, MAX_ITEMS);
  items.sort((a, b) => b.price - a.price);

  const weaponTypes = [...new Set(items.map((i) => i.weaponType))];
  return { items, weaponTypes };
}

async function getCatalog() {
  if (!SKINS_ENABLED) return { items: [], weaponTypes: [], ts: Date.now() };

  if (memCache.items && Date.now() - memCache.ts < CACHE_TTL) return memCache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      // 1) KV keshi (barcha instancelar uchun umumiy)
      if (kvEnabled) {
        try {
          const raw = await kvGet(KV_KEY);
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (parsed?.items && Date.now() - (parsed.ts || 0) < CACHE_TTL) {
              memCache = { ...parsed };
              return memCache;
            }
          }
        } catch (e) {
          console.error('[skinport] KV o\'qish xato:', e.message);
        }
      }

      // 2) Skinport'dan yangilash
      const built = toCatalog(await fetchSkinport());
      memCache = { ...built, ts: Date.now() };

      if (kvEnabled) {
        try {
          await kvSet(KV_KEY, JSON.stringify(memCache));
        } catch (e) {
          console.error('[skinport] KV yozish xato:', e.message);
        }
      }
      return memCache;
    } catch (e) {
      // Skinport ishlamasa — bor bo'lsa eski keshni qaytaramiz, bo'lmasa bo'sh
      console.error('[skinport] xato:', e.code || e.message);
      if (memCache.items) return memCache;
      return { items: [], weaponTypes: [], ts: Date.now(), error: e.code || 'fetch_failed' };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// ---------------------------------------------------------------------------
// Ommaviy API — lisSkinsFeed.js bilan bir xil imzolar
// ---------------------------------------------------------------------------

export async function queryCatalog(filters = {}) {
  const { items, weaponTypes, error } = await getCatalog();
  let list = items;

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (filters.weaponType && filters.weaponType !== 'all') {
    list = list.filter((p) => p.weaponType === filters.weaponType);
  }
  if (filters.wear && filters.wear !== 'all') {
    list = list.filter((p) => p.wear === filters.wear);
  }
  const from = parseFloat(filters.priceFrom);
  const to = parseFloat(filters.priceTo);
  if (Number.isFinite(from)) list = list.filter((p) => p.price >= from);
  if (Number.isFinite(to)) list = list.filter((p) => p.price <= to);

  list = [...list].sort((a, b) =>
    filters.sort === 'price_asc' ? a.price - b.price : b.price - a.price
  );

  const total = list.length;
  const offset = Math.max(0, Number(filters.offset) || 0);
  const limit = Math.min(120, Math.max(1, Number(filters.limit) || 60));
  const page = list.slice(offset, offset + limit);

  return { total, items: page, weaponTypes, error };
}

export async function getSkinById(id) {
  const { items } = await getCatalog();
  return items.find((p) => p.id === id) || null;
}

export async function getRelatedSkins(id, weaponType, limit = 4) {
  const { items } = await getCatalog();
  return items.filter((p) => p.id !== id && p.weaponType === weaponType).slice(0, limit);
}

// market_hash_name -> narx (USD). Steam bozor "priceoverview" o'rniga —
// bitta so'rov, 30 daqiqa keshlanadi. Steam inventarini narxlashda ishlatiladi.
let priceMemCache = { map: null, ts: 0 };

export async function getSkinportPriceMap() {
  if (priceMemCache.map && Date.now() - priceMemCache.ts < CACHE_TTL) {
    return priceMemCache.map;
  }
  try {
    const raw = await fetchSkinport();
    const map = new Map();
    for (const it of raw) {
      const usd = Number(it.min_price ?? it.suggested_price ?? it.median_price ?? it.mean_price) || 0;
      if (it.market_hash_name && usd > 0) map.set(it.market_hash_name, usd);
    }
    priceMemCache = { map, ts: Date.now() };
    return map;
  } catch (e) {
    console.error('[skinport] narx xaritasi xato:', e.code || e.message);
    return priceMemCache.map || new Map();
  }
}
