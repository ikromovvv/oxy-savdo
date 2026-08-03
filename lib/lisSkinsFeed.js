// LIS-SKINS.com ochiq (parolsiz) narxlar eksporti bilan ishlash — OQIM (stream) orqali.
//
// MUHIM TUZATISH: avvalgi variant butun feedni fetch(...).json() bilan bitta
// katta JS satriga aylantirishga urinar edi. LIS-SKINS'ning to'liq CS2
// eksporti juda katta (yuz(lab) megabayt) bo'lib chiqadi va Node buni bitta
// satrga aylantirmoqchi bo'lganda V8'ning maksimal satr uzunligidan oshib,
// "ERR_STRING_TOO_LONG" xatosini beradi. Shuning uchun javobni 'stream-json'
// yordamida OQIM sifatida, hech qachon to'liq satr/obyektga aylantirmasdan,
// elementma-element o'qiymiz — xotira sarfi feed hajmiga emas, faqat
// natijadagi katalog elementlari soniga bog'liq bo'ladi.
//
// ESLATMA: bu fayl "stream-json" paketiga muhtoj. package.json'ga qo'shilgan —
// birinchi marta shu fayllarni olgach, loyiha papkasida `npm install` qiling.
//
// Boshqa eslatmalar (hali ham dolzarb):
// 1) Narx valyutasi — LIS-SKINS eksportida narx qaysi valyutada (USD/RUB) va
//    qanday shaklda kelishini men sinov muhitidan ko'ra olmadim (tarmoq
//    cheklangan). Pastdagi PRICE_MULTIPLIER shuning uchun BASHORAT —
//    /api/lis-skins orqali xom namunani ko'rib, kerak bo'lsa .env faylida
//    LIS_SKINS_PRICE_MULTIPLIER qiymatini to'g'rilang.
// 2) Qurol turi (rifle/pistol/...) nomlar ro'yxati asosida aniqlanadi. Agar
//    biror mashhur skin "boshqa" bo'lib hech qaysi tabda ko'rinmasa — menga
//    ayting, ro'yxatga qo'shib beraman.

import { Readable } from 'node:stream';
import { parser as jsonTokenParser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { streamObject } from 'stream-json/streamers/StreamObject';

const FEED_URL = 'https://lis-skins.com/market_export_json/api_csgo_full.json';
const CATALOG_CACHE_TTL = 30 * 60 * 1000; // 30 daqiqa

const PRICE_MULTIPLIER = Number(process.env.LIS_SKINS_PRICE_MULTIPLIER) || 12700; // taxminiy USD -> so'm

// ---------------------------------------------------------------------------
// Oqim orqali feedni ochish va turini (massiv/obyekt) aniqlash
// ---------------------------------------------------------------------------

async function openFeedStream() {
  let res;
  try {
    res = await fetch(FEED_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json,*/*',
      },
      cache: 'no-store',
    });
  } catch (e) {
    const err = new Error('network_error');
    err.code = 'network_error';
    // Node'ning fetch (undici) tarmoq xatolarida asl sababni `.cause` ichiga yashiradi.
    err.detail = e?.cause?.message || e?.cause?.code || e?.message || String(e);
    throw err;
  }

  if (!res.ok) {
    const err = new Error('fetch_failed');
    err.code = 'fetch_failed';
    err.status = res.status;
    throw err;
  }
  if (!res.body) {
    const err = new Error('empty_body');
    err.code = 'empty_body';
    throw err;
  }

  return Readable.fromWeb(res.body);
}

// Feed '[' bilan boshlansa massiv, '{' bilan boshlansa obyekt-xarita.
// Birinchi bo'sh joy bo'lmagan baytni ko'ramiz, so'ng chunk'ni oqimga
// qaytarib qo'yamiz (unshift) — hech narsa yo'qolmaydi.
function detectRootShape(nodeStream) {
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      cleanup();
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      let shape = 'array';
      for (let i = 0; i < buf.length; i++) {
        const b = buf[i];
        if (b === 0x7b) { shape = 'object'; break; } // '{'
        if (b === 0x5b) { shape = 'array'; break; } // '['
        if (b !== 0x20 && b !== 0x0a && b !== 0x0d && b !== 0x09) break; // bo'sh joy emas
      }
      nodeStream.unshift(buf);
      resolve(shape);
    };
    const onError = (e) => {
      cleanup();
      reject(e);
    };
    function cleanup() {
      nodeStream.removeListener('data', onData);
      nodeStream.removeListener('error', onError);
    }
    nodeStream.once('data', onData);
    nodeStream.once('error', onError);
  });
}

function normalizeArrayEntry(it) {
  if (Array.isArray(it)) {
    return {
      name: it[0],
      price: Array.isArray(it[1]) ? Number(it[1][0]) : Number(it[1]),
      count: Array.isArray(it[1]) ? Number(it[1][1]) : Number(it[2]) || null,
    };
  }
  if (it && typeof it === 'object') {
    if ('name' in it || 'market_hash_name' in it) {
      return {
        name: it.name || it.market_hash_name,
        price: Number(it.price ?? it.min_price ?? it.cost) || null,
        count: Number(it.count ?? it.quantity ?? it.qty) || null,
      };
    }
  }
  return null;
}

function normalizeObjectEntry(name, v) {
  if (typeof v === 'object' && v !== null) {
    return {
      name,
      price: Number(v.price ?? v[0]) || null,
      count: Number(v.count ?? v.quantity ?? v[1]) || null,
    };
  }
  return { name, price: Number(v) || null, count: null };
}

// Feedni boshidan oxirigacha oqim sifatida o'qib, har bir elementni
// onItem(entry) ga uzatadi. onItem `false` qaytarsa, oqim shu yerda
// to'xtatiladi (masalan, namuna uchun limit yetganda — qolgan yuz
// megabaytlarni behuda yuklab olib o'tirmaslik uchun).
async function streamFeedItems(onItem) {
  const nodeStream = await openFeedStream();
  const shape = await detectRootShape(nodeStream);

  await new Promise((resolve, reject) => {
    let stopped = false;
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      nodeStream.destroy();
      finish();
    };

    let tokens;
    let streamer;
    try {
      tokens = nodeStream.pipe(jsonTokenParser());
      streamer = shape === 'object' ? streamObject() : streamArray();
      tokens.pipe(streamer);
    } catch (e) {
      finish(e);
      return;
    }

    streamer.on('data', ({ key, value }) => {
      if (stopped || settled) return;
      let entry;
      try {
        entry = shape === 'object' ? normalizeObjectEntry(key, value) : normalizeArrayEntry(value);
      } catch (e) {
        finish(e);
        return;
      }
      if (!entry || !entry.name) return;
      const keepGoing = onItem(entry);
      if (keepGoing === false) stop();
    });

    streamer.on('end', () => finish());
    streamer.on('error', finish);
    tokens.on('error', finish);
    nodeStream.on('error', finish);
  });
}

// Diagnostika uchun: feedning boshidagi bir nechta namunani qaytaradi —
// butun feedni yuklab olmaydi, `limit` yetgach oqimni to'xtatadi.
export async function getLisSkinsSample(limit = 20) {
  const sample = [];
  let total = 0;

  await streamFeedItems((entry) => {
    total++;
    if (sample.length < limit) sample.push(entry);
    if (sample.length >= limit) return false; // yetarli — to'xtaymiz
  });

  return { total, sample };
}

// ---------------------------------------------------------------------------
// Nomdan qurol/naqsh/holatni ajratib olish va qurol turini aniqlash
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
// To'liq katalogni qurish (oqim orqali, keshlab)
// ---------------------------------------------------------------------------

let catalogCache = { items: null, weaponTypes: [], ts: 0 };
let catalogInflight = null;

async function buildCatalog() {
  const seen = new Set();
  const items = [];

  await streamFeedItems((it) => {
    if (!it.name) return;
    const parsed = parseSkinName(it.name);
    if (!parsed) return;

    const weaponType = classifyWeapon(parsed.weaponBase);
    if (!weaponType) return; // stiker/keys/agent va h.k. — skin emas

    const id = slugify(it.name);
    if (!id || seen.has(id)) return;
    seen.add(id);

    const priceUsdLike = Number(it.price) || 0;

    items.push({
      id,
      category: 'skins',
      weaponType,
      wear: parsed.wear || null,
      stattrak: parsed.stattrak,
      souvenir: parsed.souvenir,
      name: `${parsed.weaponBase} | ${parsed.skinName}`,
      fullName: it.name,
      price: Math.max(0, Math.round(priceUsdLike * PRICE_MULTIPLIER)),
      count: Number.isFinite(it.count) ? it.count : null,
    });
  });

  const weaponTypes = [...new Set(items.map((i) => i.weaponType))];
  return { items, weaponTypes };
}

async function getCatalog() {
  if (catalogCache.items && Date.now() - catalogCache.ts < CATALOG_CACHE_TTL) {
    return catalogCache;
  }
  if (catalogInflight) return catalogInflight;

  catalogInflight = (async () => {
    const built = await buildCatalog();
    catalogCache = { ...built, ts: Date.now() };
    return catalogCache;
  })();

  try {
    return await catalogInflight;
  } finally {
    catalogInflight = null;
  }
}

// filters: { query, weaponType, wear, priceFrom, priceTo, sort, limit, offset }
export async function queryCatalog(filters = {}) {
  const { items, weaponTypes } = await getCatalog();
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

  return { total, items: page, weaponTypes };
}

export async function getSkinById(id) {
  const { items } = await getCatalog();
  return items.find((p) => p.id === id) || null;
}

export async function getRelatedSkins(id, weaponType, limit = 4) {
  const { items } = await getCatalog();
  return items.filter((p) => p.id !== id && p.weaponType === weaponType).slice(0, limit);
}
