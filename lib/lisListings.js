// LIS-SKINS: bitta skin nomi uchun HOZIR sotib olsa bo'ladigan nusxalar (float, naqsh, stikerlar, inspect havola).
// Mahsulot sahifasida "Mavjud nusxalar" ro'yxati uchun. LIS API kaliti kerak (faqat serverda).
//
// Narx: lib/pricing.js (cost rejimida = LIS narxi). Har bir nusxaning o'z `id` si bor —
// savat/buyurtma aynan shu nusxani sotib oladi (lib/fulfill/lis.js buy({ listingId })).

import { searchSkins, configured } from './fulfill/lis';
import { sellPrice } from './pricing';
import { getPriceOverrides } from './priceOverrides';

const USD_UZS = Number(process.env.USD_UZS) || Number(process.env.LIS_SKINS_PRICE_MULTIPLIER) || 12700;
const TTL = 30 * 1000;
const cache = new Map(); // name -> { ts, items }

export function lisSourceActive() {
  return (process.env.SKINS_SOURCE || '').toLowerCase() === 'lis';
}

// LIS yozuvi -> sayt shakli
export function toListing(s, overrides = {}) {
  const floatValue = s.item_float != null && s.item_float !== '' ? Number(s.item_float) : null;
  const p = sellPrice(
    {
      costUsd: Number(s.price),
      marketHashName: s.name,
      floatValue: Number.isFinite(floatValue) ? floatValue : undefined,
      paintSeed: s.item_paint_seed ?? undefined,
      listingId: String(s.id),
    },
    overrides
  );
  return {
    id: s.id,
    name: s.name,
    price: Math.max(0, Math.round(p.sellUsd * USD_UZS)),
    priceUsd: p.sellUsd,
    costUsd: Number(s.price),
    floatValue: Number.isFinite(floatValue) ? floatValue : null,
    paintSeed: Number.isInteger(Number(s.item_paint_seed)) && s.item_paint_seed != null ? Number(s.item_paint_seed) : null,
    paintIndex: Number.isInteger(Number(s.item_paint_index)) && s.item_paint_index != null ? Number(s.item_paint_index) : null,
    inspectLink: typeof s.item_link === 'string' && s.item_link.startsWith('steam://') ? s.item_link : null,
    stickers: Array.isArray(s.stickers)
      ? s.stickers.slice(0, 6).map((x) => ({ name: x.name || '', image: x.image || null, slot: x.slot ?? null }))
      : [],
    instant: Number(s.delivery_type) === 1, // 1 — darhol, 2 — sekin (12 soatgacha)
    nameTag: s.name_tag || null,
  };
}

export async function getLisListings(fullName, { limit = 30 } = {}) {
  if (!configured()) return [];
  const hit = cache.get(fullName);
  if (hit && Date.now() - hit.ts < TTL) return hit.items.slice(0, limit);

  const [raw, overrides] = await Promise.all([searchSkins({ name: fullName }), getPriceOverrides()]);
  const items = raw
    .filter((s) => Number(s.price) > 0 && !s.unlock_at)
    .map((s) => toListing(s, overrides))
    .sort((a, b) => a.price - b.price);
  cache.set(fullName, { ts: Date.now(), items });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return items.slice(0, limit);
}
