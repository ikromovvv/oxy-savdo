// cs2shop katalogi — HAR BIR NUSXA alohida (nom bo'yicha jamlanmagan).
//
// SKINS_SOURCE=cs2shop bo'lsa lib/skinportFeed.js shu modulga yo'naltiradi.
// Har bir listing = bitta real skin (o'z float'i, naqshi, narxi, unlock vaqti):
//   id = listingId (cs2shop UUID) — savat/buyurtma aynan shu nusxani sotib oladi.
// Sotuv narxi lib/pricing.js (tannarx + foyda + float/naqsh ustamasi) bilan hisoblanadi.
//
// Xotira keshi: butun katalog (~10k nusxa) instance xotirasida, 60 soniya (ETag bilan yangilanadi).

import { fetchListings } from './cs2shopFeed';
import { sellPrice } from './pricing';
import { getPriceOverrides } from './priceOverrides';
import { classifyWeapon, parseSkinName } from './skinNames';

const USD_UZS =
  Number(process.env.USD_UZS) || Number(process.env.LIS_SKINS_PRICE_MULTIPLIER) || 12700;
const TTL = 60 * 1000;

let cache = { items: null, byId: null, ts: 0 };
let inflight = null;

const unlocked = (iso, now = Date.now()) => !iso || Date.parse(iso) <= now;

// bitta cs2shop listing -> sayt mahsuloti
export function toItem(l, overrides = {}) {
  const name = l.market_hash_name;
  const parsed = parseSkinName(name);
  if (!parsed) return null;
  const weaponType = classifyWeapon(parsed.weaponBase);
  if (!weaponType) return null;
  if (!(Number(l.price) > 0)) return null;

  const p = sellPrice(
    {
      costUsd: l.price,
      marketHashName: name,
      floatValue: l.floatValue,
      phase: l.phase,
      paintSeed: l.paint_seed,
      listingId: l.listingId,
    },
    overrides
  );
  const unlockAt = l.availableAfter || l.tradableAt || null;
  return {
    id: l.listingId,
    listingId: l.listingId,
    category: 'skins',
    weaponType,
    wear: parsed.wear || null,
    stattrak: parsed.stattrak,
    souvenir: parsed.souvenir,
    name: `${parsed.weaponBase} | ${parsed.skinName}`,
    fullName: name,
    price: Math.max(0, Math.round(p.sellUsd * USD_UZS)),
    costUsd: Number(l.price),
    count: 1,
    floatValue: Number.isFinite(l.floatValue) ? l.floatValue : null,
    phase: l.phase || null,
    paintSeed: Number.isInteger(l.paint_seed) ? l.paint_seed : null,
    inspectLink: l.inspectLink || null,
    availableAfter: unlockAt && !unlocked(unlockAt) ? unlockAt : null, // null = hozir olsa bo'ladi
  };
}

async function load() {
  if (cache.items && Date.now() - cache.ts < TTL) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [raw, overrides] = await Promise.all([fetchListings(), getPriceOverrides()]);
      const items = [];
      for (const l of raw) {
        const it = toItem(l, overrides);
        if (it) items.push(it);
      }
      cache = { items, byId: new Map(items.map((x) => [x.id, x])), ts: Date.now() };
      return cache;
    } catch (e) {
      console.error('[cs2shop] katalog xato:', e.code || e.message);
      if (cache.items) return cache; // eski kesh
      throw e;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// FAQAT testlar uchun
export function __seedListingsForTest(rawListings, overrides = {}) {
  const items = rawListings.map((l) => toItem(l, overrides)).filter(Boolean);
  cache = { items, byId: new Map(items.map((x) => [x.id, x])), ts: Date.now() + 365 * 24 * 3600 * 1000 };
}

export async function getListingById(id) {
  const { byId } = await load();
  const it = byId.get(id);
  if (!it) return null;
  // vaqt o'tgan bo'lsa unlock holati yangilanadi
  return it.availableAfter && unlocked(it.availableAfter) ? { ...it, availableAfter: null } : it;
}

// O'sha nomdagi boshqa nusxalar (boshqa float), keyin shu qurol turidagi boshqalar
export async function getRelatedListings(id, weaponType, limit = 4) {
  const { items, byId } = await load();
  const cur = byId.get(id);
  const same = cur ? items.filter((x) => x.fullName === cur.fullName && x.id !== id) : [];
  same.sort((a, b) => a.price - b.price);
  const out = same.slice(0, limit);
  if (out.length < limit) {
    const seen = new Set(out.map((x) => x.id));
    for (const x of items) {
      if (out.length >= limit) break;
      if (x.id !== id && !seen.has(x.id) && x.weaponType === weaponType) out.push(x);
    }
  }
  return out;
}

const SORTS = {
  price_desc: (a, b) => b.price - a.price,
  price_asc: (a, b) => a.price - b.price,
  float_asc: (a, b) => (a.floatValue ?? 9) - (b.floatValue ?? 9) || a.price - b.price,
  float_desc: (a, b) => (b.floatValue ?? -1) - (a.floatValue ?? -1) || a.price - b.price,
};

// filters: query, weaponType, wear, priceFrom, priceTo (so'm), rarity (CSGO-API nomi),
//          availability ('all' | 'now' | 'later'), sort, offset, limit
export async function queryListings(filters = {}) {
  const { items, weaponTypes } = await withTypes(await load());
  const now = Date.now();
  let list = items;

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter((p) => p.fullName.toLowerCase().includes(q));
  }
  if (filters.wear && filters.wear !== 'all') list = list.filter((p) => p.wear === filters.wear);
  const from = parseFloat(filters.priceFrom);
  const to = parseFloat(filters.priceTo);
  if (Number.isFinite(from)) list = list.filter((p) => p.price >= from);
  if (Number.isFinite(to)) list = list.filter((p) => p.price <= to);
  if (filters.availability === 'now') list = list.filter((p) => unlocked(p.availableAfter, now));
  if (filters.availability === 'later') list = list.filter((p) => !unlocked(p.availableAfter, now));

  if (filters.rarity && filters.rarity !== 'all') {
    const { getSkinMeta } = await import('./skinImages');
    const names = [...new Set(list.map((p) => p.name))];
    const meta = await getSkinMeta(names).catch(() => ({}));
    list = list.filter((p) => {
      // pichoq / qo'lqop — doim "Extraordinary" (CSGO-API ba'zan ularni boshqacha belgilaydi)
      const r = p.weaponType === 'knife' || p.weaponType === 'gloves' ? 'Extraordinary' : meta[p.name]?.rarity || null;
      return r === filters.rarity;
    });
  }

  // kategoriya tablari uchun sonlar (qurol turi filtridan tashqari)
  const weaponCounts = {};
  for (const p of list) weaponCounts[p.weaponType] = (weaponCounts[p.weaponType] || 0) + 1;

  if (filters.weaponType && filters.weaponType !== 'all') {
    list = list.filter((p) => p.weaponType === filters.weaponType);
  }

  list = [...list].sort(SORTS[filters.sort] || SORTS.price_desc);

  const total = list.length;
  const offset = Math.max(0, Number(filters.offset) || 0);
  const limit = Math.min(120, Math.max(1, Number(filters.limit) || 60));
  return { total, items: list.slice(offset, offset + limit), weaponTypes, weaponCounts };
}

async function withTypes(c) {
  return { items: c.items, weaponTypes: [...new Set(c.items.map((i) => i.weaponType))] };
}
