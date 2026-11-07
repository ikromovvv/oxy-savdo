// cs2shop katalogi -> sayt katalogi uchun (market_hash_name bo'yicha jamlangan).
//
// Katalog manbasi: SKINS_SOURCE=cs2shop (birlamchi: Skinport). Har bir nom uchun
// HOZIR trade qilsa bo'ladigan eng arzon listing olinadi, sotuv narxi lib/pricing.js
// bilan hisoblanadi. Skinport feed shaklidagi yozuv qaytaradi:
//   { market_hash_name, min_price (SOTUV narxi, USD), quantity, costUsd, listingId, ... }
//
// Eslatma: bu nom darajasidagi katalog. Aniq float/naqsh bo'yicha alohida listinglar
// (har bir nusxa alohida karta) keyingi bosqich.

import { sellPrice } from './pricing';
import { getPriceOverrides } from './priceOverrides';

const BASE = process.env.CS2SHOP_BASE_URL || 'https://cs2shop.net';

export function cs2shopConfigured() {
  return Boolean(process.env.CS2SHOP_MERCHANT_ID && process.env.CS2SHOP_API_KEY);
}

let etag = null;
let lastListings = null;

// To'liq katalog snapshot (ETag bilan). 304 bo'lsa oldingisini qaytaradi.
export async function fetchListings() {
  const headers = {
    'x-merchant-id': process.env.CS2SHOP_MERCHANT_ID || '',
    'x-api-key': process.env.CS2SHOP_API_KEY || '',
  };
  if (etag && lastListings) headers['If-None-Match'] = etag;
  const res = await fetch(`${BASE}/v1/merchant/listings/catalog`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 304 && lastListings) return lastListings;
  if (!res.ok) {
    const err = new Error('cs2shop_fetch_failed');
    err.code = res.status === 429 ? 'rate_limited' : 'fetch_failed';
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  lastListings = Array.isArray(data.items) ? data.items : [];
  etag = res.headers.get('etag') || null;
  return lastListings;
}

const tradableNow = (l) => !l.availableAfter || Date.parse(l.availableAfter) <= Date.now();

// listinglar -> nom bo'yicha jamlangan, sotuv narxi bilan (Skinport feed shakli)
export function aggregate(listings, overrides = {}) {
  const byName = new Map();
  for (const l of listings) {
    if (!l?.market_hash_name || !(Number(l.price) > 0) || !tradableNow(l)) continue;
    const cur = byName.get(l.market_hash_name);
    if (!cur) byName.set(l.market_hash_name, { best: l, count: 1 });
    else {
      cur.count++;
      if (l.price < cur.best.price) cur.best = l;
    }
  }

  const out = [];
  for (const [name, { best, count }] of byName) {
    const p = sellPrice(
      {
        costUsd: best.price,
        marketHashName: name,
        floatValue: best.floatValue,
        phase: best.phase,
        paintSeed: best.paint_seed,
        listingId: best.listingId,
      },
      overrides
    );
    out.push({
      market_hash_name: name,
      min_price: p.sellUsd,
      quantity: count,
      costUsd: best.price,
      listingId: best.listingId,
      floatValue: best.floatValue ?? null,
      phase: best.phase ?? null,
    });
  }
  return out;
}

export async function fetchAggregated() {
  const [listings, overrides] = await Promise.all([fetchListings(), getPriceOverrides()]);
  return aggregate(listings, overrides);
}
