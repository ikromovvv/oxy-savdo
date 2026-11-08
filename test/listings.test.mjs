// Nusxa bo'yicha katalog (cs2shopListings) + buyurtma + yetkazish — node:test, tarmoqsiz.
// SKINS_SOURCE=cs2shop; katalog __seedListingsForTest bilan to'ldiriladi, cs2shop API soxta fetch bilan.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-listings-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
const PROJECT = path.resolve(import.meta.dirname, '..');
process.chdir(TMP);

process.env.SESSION_SECRET = 'test-secret';
process.env.SKINS_SOURCE = 'cs2shop';
process.env.PRICING_MODE = 'markup';
process.env.FULFILL_PROVIDER = 'cs2shop';
process.env.CS2SHOP_MERCHANT_ID = 'Oxy';
process.env.CS2SHOP_API_KEY = 'cs2_testkey';
process.env.USD_UZS = '12700';
process.env.ORDER_MIN_UZS = '1000';
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);
const L = await imp('lib/cs2shopListings.js');
const { getSkinById, queryCatalog } = await imp('lib/skinportFeed.js');
const { createOrder, getOrder, updateOrder } = await imp('lib/orderStore.js');
const { fulfillOrder } = await imp('lib/fulfillment.js');

const FUTURE = new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString();
const raw = (id, name, price, extra = {}) => ({
  listingId: id, market_hash_name: name, price, availableAfter: null, tradableAt: null,
  floatValue: null, phase: null, paint_seed: null, inspectLink: null, ...extra,
});

L.__seedListingsForTest([
  raw('a1', 'AK-47 | Redline (Field-Tested)', 10, { floatValue: 0.151 }),
  raw('a2', 'AK-47 | Redline (Field-Tested)', 12, { floatValue: 0.289 }),
  raw('a3', 'AK-47 | Redline (Field-Tested)', 11, { floatValue: 0.16, availableAfter: FUTURE }),
  raw('k1', '★ Karambit | Doppler (Factory New)', 400, { floatValue: 0.012, phase: 'Ruby' }),
  raw('s1', 'AWP | Dragon Lore (Factory New)', 1500, { floatValue: 0.0065 }),
  raw('x', 'Sticker | Not A Weapon', 1),
]);

const TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCd1234';

test('har nusxa alohida: bir xil nomdan 3 ta nusxa, qurol bo\'lmagan buyum tushmaydi', async () => {
  const r = await queryCatalog({ limit: 50 });
  assert.equal(r.total, 5);
  assert.equal(r.items.filter((x) => x.fullName === 'AK-47 | Redline (Field-Tested)').length, 3);
  assert.ok(r.items.every((x) => x.listingId && x.id === x.listingId));
});

test('nusxa float / naqsh / unlock ma\'lumotlarini saqlaydi', async () => {
  const a1 = await getSkinById('a1');
  assert.equal(a1.floatValue, 0.151);
  assert.equal(a1.availableAfter, null);
  const a3 = await getSkinById('a3');
  assert.ok(a3.availableAfter);
  assert.equal((await getSkinById('k1')).phase, 'Ruby');
  assert.equal(await getSkinById('yoq'), null);
});

test('narx: float / faza ustamasi har nusxaga alohida qo\'llanadi', async () => {
  const k = await getSkinById('k1');
  // Ruby (+25%) + past float (+12%) -> asosiy foydadan yuqori
  const base = (await import(pathToFileURL(path.join(PROJECT, 'lib/pricing.js')).href)).sellPrice({ costUsd: 400, marketHashName: '★ Karambit | Doppler (Factory New)' });
  assert.ok(k.price > Math.round(base.sellUsd * 12700));
  const dl = await getSkinById('s1');
  assert.ok(dl.price > 0);
});

test('filtrlar: availability / wear / qurol turi / qidiruv', async () => {
  assert.equal((await queryCatalog({ availability: 'now' })).total, 4);
  const later = await queryCatalog({ availability: 'later' });
  assert.equal(later.total, 1);
  assert.equal(later.items[0].id, 'a3');
  assert.equal((await queryCatalog({ wear: 'Factory New' })).total, 2);
  assert.equal((await queryCatalog({ weaponType: 'knife' })).total, 1);
  assert.equal((await queryCatalog({ query: 'dragon' })).total, 1);
});

test('saralash: float past -> baland, narx', async () => {
  const f = await queryCatalog({ sort: 'float_asc', limit: 10 });
  assert.equal(f.items[0].id, 's1'); // 0.0065
  const p = await queryCatalog({ sort: 'price_asc', limit: 10 });
  assert.ok(p.items[0].price <= p.items[1].price);
});

test('kategoriya sonlari (qurol turi filtridan tashqari)', async () => {
  const r = await queryCatalog({ weaponType: 'knife' });
  assert.equal(r.weaponCounts.rifle, 3);
  assert.equal(r.weaponCounts.knife, 1);
  assert.equal(r.total, 1);
});

test('o\'xshash: o\'sha nomdagi boshqa float\'lar birinchi', async () => {
  const rel = await L.getRelatedListings('a1', 'rifle', 4);
  assert.deepEqual(rel.map((x) => x.id), ['a3', 'a2']);
});

// ---- buyurtma ----

test('buyurtma: nusxa narxi serverdan, qty=1 majburan, listingId saqlanadi', async () => {
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'a1', name: 'x', price: 1, qty: 5, kind: 'skin' }],
  });
  assert.ok(res.order, res.error);
  const it = res.order.items[0];
  assert.equal(it.listingId, 'a1');
  assert.equal(it.qty, 1);
  assert.equal(it.floatValue, 0.151);
  assert.equal(it.price, (await getSkinById('a1')).price);
});

test('buyurtma: trade-qulfi bor nusxa rad etiladi', async () => {
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'a3', name: 'x', price: 1, qty: 1, kind: 'skin' }],
  });
  assert.match(res.error, /trade qulfi/);
});

test('buyurtma: yo\'q (sotilgan) nusxa rad etiladi', async () => {
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'sotilgan', name: 'x', price: 1, qty: 1, kind: 'skin' }],
  });
  assert.ok(res.error);
});

// ---- yetkazish: aniq shu nusxa sotib olinadi ----

test('yetkazish: cs2shop\'dan aniq buyurtmadagi listingId sotib olinadi (arzonrog\'i emas)', async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method: init.method || 'GET', path: u.pathname, body });
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
    if (u.pathname.startsWith('/v1/merchant/listings/')) {
      return json({ item: { listingId: 'a2', market_hash_name: 'AK-47 | Redline (Field-Tested)', price: 12, availableAfter: null } });
    }
    if (u.pathname === '/v1/merchant/trades') return json({ status: 'PENDING', priceUsd: 12 });
    return json({}, 404);
  };

  // qimmatroq (a2, float 0.289) nusxani sotib olgan mijoz
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'a2', name: 'x', price: 1, qty: 1, kind: 'skin' }],
  });
  assert.ok(res.order, res.error);
  await updateOrder(res.order.id, { status: 'paid', by: 'test' });

  const r = await fulfillOrder(res.order.id);
  assert.equal(r.ok, true, JSON.stringify(r));

  const post = calls.find((c) => c.method === 'POST' && c.path === '/v1/merchant/trades');
  assert.equal(post.body.listingId, 'a2');
  assert.equal(calls.some((c) => c.path === '/v1/merchant/listings'), false, 'nom bo\'yicha qidirilmasligi kerak');
  const o = await getOrder(res.order.id);
  assert.equal(o.fulfillment.items[0].providerRef.startsWith(res.order.ref), true);
});

test('yetkazish: nusxa sotilib ketgan bo\'lsa — xato (arzon boshqa nusxa jimgina berilmaydi)', async () => {
  globalThis.fetch = async (url) => {
    const u = new URL(String(url));
    if (u.pathname.startsWith('/v1/merchant/listings/')) {
      return new Response(JSON.stringify({ error: 'item_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
  };
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'a1', name: 'x', price: 1, qty: 1, kind: 'skin' }],
  });
  await updateOrder(res.order.id, { status: 'paid', by: 'test' });
  const r = await fulfillOrder(res.order.id);
  assert.ok(r.error);
  assert.equal((await getOrder(res.order.id)).status, 'paid');
});

// ---- cost rejimi: sayt narxi = cs2shop narxi (so'mda), $ narx alohida ----

test('cost rejimi: nusxa narxi = cs2shop narxi * kurs, priceUsd = cs2shop narxi', async () => {
  process.env.PRICING_MODE = 'cost';
  try {
    L.__seedListingsForTest([raw('c1', 'AK-47 | Redline (Field-Tested)', 12.34, { floatValue: 0.151 })]);
    const it = await getSkinById('c1');
    assert.equal(it.priceUsd, 12.34);
    assert.equal(it.price, Math.round(12.34 * 12700));
    assert.equal(it.costUsd, 12.34);
  } finally {
    process.env.PRICING_MODE = 'markup';
  }
});
