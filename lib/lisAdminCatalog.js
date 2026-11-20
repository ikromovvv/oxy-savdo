// Admin paneli uchun LIS-SKINS katalogi: ochiq "qisqa ro'yxat" (nom darajasida) ustida filtr / saralash / sahifalash.
// Manba: lib/lisCatalog.js fetchLisShortList() — [{ name, price, unlocked_price, url, count }].
//   price          — eng arzon nusxa (qulfli bo'lishi mumkin)
//   unlocked_price — eng arzon QULFSIZ nusxa (yo'q bo'lsa null)
// Sof funksiya (tarmoqsiz) — testlash oson.

import { parseSkinName, classifyWeapon } from './skinNames';

const PER_PAGE = 48;
const SORTS = {
  price_desc: (a, b) => b.price - a.price,
  price_asc: (a, b) => a.price - b.price,
  count_desc: (a, b) => b.count - a.count || b.price - a.price,
};

// filters: query, weaponType, wear, rarity, availability ('all'|'unlocked'|'locked'),
//          priceFrom, priceTo (USD), sort, page
// opts.rarityOf(baseName) -> CSGO-API rarity nomi (rarity filtri uchun)
export function queryLisList(list, filters = {}, opts = {}) {
  const q = String(filters.query || '').trim().toLowerCase();
  const from = parseFloat(filters.priceFrom);
  const to = parseFloat(filters.priceTo);

  const rows = [];
  for (const e of list) {
    const name = e?.name;
    if (!name) continue;
    const parsed = parseSkinName(name);
    if (!parsed) continue;
    const weaponType = classifyWeapon(parsed.weaponBase);
    if (!weaponType) continue; // stiker / keys / grafiti va boshqalar katalogga kirmaydi

    const unlockedPrice = Number(e.unlocked_price) > 0 ? Number(e.unlocked_price) : null;
    const price = unlockedPrice ?? (Number(e.price) || 0);
    if (!(price > 0)) continue;
    const unlocked = unlockedPrice != null;

    if (q && !name.toLowerCase().includes(q)) continue;
    if (filters.wear && filters.wear !== 'all' && parsed.wear !== filters.wear) continue;
    if (Number.isFinite(from) && price < from) continue;
    if (Number.isFinite(to) && price > to) continue;
    if (filters.availability === 'unlocked' && !unlocked) continue;
    if (filters.availability === 'locked' && unlocked) continue;

    const baseName = `${parsed.weaponBase} | ${parsed.skinName}`;
    if (filters.rarity && filters.rarity !== 'all') {
      const r = weaponType === 'knife' || weaponType === 'gloves' ? 'Extraordinary' : opts.rarityOf?.(baseName) || null;
      if (r !== filters.rarity) continue;
    }

    rows.push({
      name,
      baseName,
      weaponType,
      wear: parsed.wear || null,
      stattrak: parsed.stattrak,
      souvenir: parsed.souvenir,
      price,
      unlocked,
      lockedPrice: Number(e.price) > 0 ? Number(e.price) : null,
      count: Number(e.count) || 0,
      url: typeof e.url === 'string' && e.url.startsWith('https://lis-skins.') ? e.url : null,
    });
  }

  // kategoriya sonlari (qurol turi filtridan tashqari barcha filtrlar bilan): nusxalar soni
  const weaponCounts = {};
  for (const r of rows) weaponCounts[r.weaponType] = (weaponCounts[r.weaponType] || 0) + r.count;

  const sel = filters.weaponType && filters.weaponType !== 'all' ? rows.filter((r) => r.weaponType === filters.weaponType) : rows;

  let matched = 0;
  let value = 0;
  for (const r of sel) {
    matched += r.count;
    value += r.price * r.count;
  }

  const sorted = [...sel].sort(SORTS[filters.sort] || SORTS.price_desc);
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(filters.page) || 1));
  const items = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return { total: sorted.length, matched, value: Math.round(value * 100) / 100, weaponCounts, page, pages, perPage: PER_PAGE, items };
}
