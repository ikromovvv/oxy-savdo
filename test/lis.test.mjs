// LIS-SKINS: katalog (qisqa ro'yxat), adapter va buyurtma oqimi — node:test, soxta fetch bilan (tarmoq va pul yo'q).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-lis-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
const PROJECT = path.resolve(import.meta.dirname, '..');
process.chdir(TMP);

process.env.SESSION_SECRET = 'test-secret';
process.env.SKINS_SOURCE = 'lis';
process.env.FULFILL_PROVIDER = 'lis';
process.env.LIS_SKINS_API_KEY = 'lis_test_key';
process.env.USD_UZS = '12700';
process.env.ORDER_MIN_UZS = '1000';
delete process.env.PRICING_MODE; // birlamchi: cost
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);
const lis = await imp('lib/fulfill/lis.js');
const cat = await imp('lib/lisCatalog.js');
const { queryCatalog, getSkinById } = await imp('lib/skinportFeed.js');
const { createOrder, getOrder, updateOrder } = await imp('lib/orderStore.js');
const { fulfillOrder, pollFulfillment } = await imp('lib/fulfillment.js');

const NAME = 'AK-47 | Redline (Field-Tested)';
const TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCd1234';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const skin = (id, price, extra = {}) => ({ id, name: NAME, price, unlock_at: null, item_float: '0.2', ...extra });
const purchase = (customId, status, extra = {}) => ({
  purchase_id: 55, steam_id: '1', created_at: '2026-11-19T00:00:00Z', custom_id: customId,
  skins: [{ id: 1, name: NAME, price: 5, status, return_reason: null, error: null, steam_trade_offer_id: null, steam_trade_offer_finished_at: null, ...extra }],
});

// Soxta LIS: marshrutga qarab javob; so'rovlar jurnali saqlanadi
function mock(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const call = {
      method: init.method || 'GET',
      path: u.pathname,
      query: u.searchParams,
      body: init.body ? JSON.parse(init.body) : null,
      auth: init.headers?.Authorization,
    };
    calls.push(call);
    return handler(call);
  };
  return calls;
}

// ---- katalog ----

test('aggregateLis: qulfsiz narxi yo\'q nomlar tushmaydi, narx = qulfsiz narx (cost rejimi)', () => {
  const out = cat.aggregateLis([
    { name: NAME, price: 4, unlocked_price: 5, count: 10 },
    { name: 'Locked | Only (Factory New)', price: 3, unlocked_price: null, count: 2 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].min_price, 5);
  assert.equal(out[0].costUsd, 5);
  assert.equal(out[0].quantity, 10);
});

test('katalog: SKINS_SOURCE=lis -> sayt narxi = LIS narxi * kurs, tagida $', async () => {
  mock((c) => {
    if (c.path === '/market_export_json/csgo.json') {
      return json([
        { name: NAME, price: 4.5, unlocked_price: 5.25, url: 'x', count: 7 },
        { name: 'MP9 | Hot Rod (Factory New)', price: 2, unlocked_price: 2.1, url: 'x', count: 3 },
        { name: 'Sticker | Something', price: 1, unlocked_price: 1, url: 'x', count: 9 },
      ]);
    }
  });
  const r = await queryCatalog({ limit: 10 });
  assert.equal(r.total, 2); // stiker katalogga kirmaydi
  const ak = r.items.find((x) => x.fullName === NAME);
  assert.equal(ak.priceUsd, 5.25);
  assert.equal(ak.price, Math.round(5.25 * 12700));
  assert.equal(ak.count, 7);
  assert.equal((await getSkinById(ak.id)).fullName, NAME);
});

// ---- adapter ----

test('buy: qulfsiz eng arzon skinni topib, to\'g\'ri body bilan sotib oladi', async () => {
  const calls = mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [] });
    if (c.path === '/v1/market/search') return json({ data: [skin(11, 5.3), skin(10, 5), skin(12, 4.9, { unlock_at: '2999-01-01T00:00:00Z' }), skin(13, 1, { name: 'Boshqa' })] });
    if (c.path === '/v1/market/buy') return json({ data: purchase(c.body.custom_id, 'processing') });
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '123456789', token: 'AbCd1234', customId: 'OXY-AAAAAA-ak-0' });
  assert.equal(r.ok, true);
  assert.equal(r.providerRef, 'OXY-AAAAAA-ak-0');
  assert.equal(r.state, 'processing');

  const search = calls.find((c) => c.path === '/v1/market/search');
  assert.equal(search.query.get('only_unlocked'), '1');
  assert.equal(search.query.get('names[]'), NAME);
  assert.equal(search.auth, 'Bearer lis_test_key');

  const buyCall = calls.find((c) => c.path === '/v1/market/buy');
  assert.deepEqual(buyCall.body.ids, [10]); // 10 (5.00) va 11 (5.30): limit 5.15 -> faqat 10
  assert.equal(buyCall.body.ids.length, 1);
});

test('buy: limitdan qimmat bo\'lsa sotib olmaydi (zarar ko\'rmaslik)', async () => {
  const calls = mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [] });
    if (c.path === '/v1/market/search') return json({ data: [skin(11, 5.6)] });
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '1', token: 't', customId: 'R2' });
  assert.equal(r.ok, false);
  assert.match(r.error, /narxi oshib ketdi/);
  assert.equal(calls.some((c) => c.path === '/v1/market/buy'), false);
});

test('buy: custom_id bilan buyurtma allaqachon bor -> qayta sotib OLMAYDI', async () => {
  const calls = mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [purchase('R3', 'wait_accept', { steam_trade_offer_id: '777' })] });
    if (c.path === '/v1/market/search') return json({ data: [skin(10, 5)] });
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '1', token: 't', customId: 'R3' });
  assert.equal(r.ok, true);
  assert.equal(r.state, 'sent');
  assert.equal(calls.some((c) => c.path === '/v1/market/buy'), false);
});

test('buy: avvalgi urinish "return" (qaytarilgan) bo\'lsa — yangi custom_id (~2) bilan qayta sotib oladi', async () => {
  const bought = [];
  mock((c) => {
    if (c.path === '/v1/market/info') {
      const id = c.query.get('custom_ids[]');
      return json({ data: id === 'R4' ? [purchase('R4', 'return', { return_reason: 'trade_canceled' })] : [] });
    }
    if (c.path === '/v1/market/search') return json({ data: [skin(10, 5)] });
    if (c.path === '/v1/market/buy') { bought.push(c.body.custom_id); return json({ data: purchase(c.body.custom_id, 'processing') }); }
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '1', token: 't', customId: 'R4' });
  assert.equal(r.ok, true);
  assert.equal(r.providerRef, 'R4~2');
  assert.deepEqual(bought, ['R4~2']);
});

test('buy: 500 -> avval info; yaratilgan bo\'lsa qabul qiladi', async () => {
  let infoCalls = 0;
  mock((c) => {
    if (c.path === '/v1/market/info') { infoCalls++; return json({ data: infoCalls > 1 ? [purchase('R5', 'processing')] : [] }); }
    if (c.path === '/v1/market/search') return json({ data: [skin(10, 5)] });
    if (c.path === '/v1/market/buy') return json({ message: 'Server Error' }, 500);
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '1', token: 't', customId: 'R5' });
  assert.equal(r.ok, true);
  assert.equal(r.providerRef, 'R5');
});

test('buy: balans yetarli emas -> aniq xabar', async () => {
  mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [] });
    if (c.path === '/v1/market/search') return json({ data: [skin(10, 5)] });
    if (c.path === '/v1/market/buy') return json({ message: 'Insufficient balance' }, 400);
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '1', token: 't', customId: 'R6' });
  assert.equal(r.ok, false);
  assert.match(r.error, /balansida/);
});

test('buy: skin sotilib ketgan (400) -> keyingi nomzod', async () => {
  let n = 0;
  mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [] });
    if (c.path === '/v1/market/search') return json({ data: [skin(10, 5), skin(11, 5.1)] });
    if (c.path === '/v1/market/buy') {
      n++;
      return c.body.ids[0] === 10 ? json({ message: 'Skin not available' }, 400) : json({ data: purchase(c.body.custom_id, 'processing') });
    }
  });
  const r = await lis.buy({ marketHashName: NAME, salePriceUSD: 5, maxPriceUSD: 5.15, partner: '1', token: 't', customId: 'R7' });
  assert.equal(r.ok, true);
  assert.equal(n, 2);
});

test('status: LIS statuslari bizning holatlarga o\'giriladi', async () => {
  const cases = [
    [purchase('x', 'processing'), 'processing'],
    [purchase('x', 'wait_accept'), 'sent'],
    [purchase('x', 'return', { return_reason: 'trade_timeout' }), 'error'],
    [purchase('x', 'accepted', { steam_trade_offer_finished_at: '2026-11-19T01:00:00Z' }), 'done'],
  ];
  for (const [p, want] of cases) {
    mock((c) => json({ data: [p] }));
    assert.equal((await lis.status('x')).state, want, p.skins[0].status);
  }
  mock(() => json({ data: [] }));
  assert.equal((await lis.status('x')).state, 'error'); // topilmadi
  mock(() => json({ message: 'maintenance' }, 503));
  assert.equal((await lis.status('x')).state, 'processing'); // vaqtinchalik
});

test('status: wait_withdraw bo\'lsa withdraw chaqiriladi', async () => {
  const calls = mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [purchase('w', 'wait_withdraw')] });
    return json({ data: [] });
  });
  const s = await lis.status('w');
  assert.equal(s.state, 'processing');
  assert.ok(calls.some((c) => c.path === '/v1/market/withdraw' && c.body.custom_id === 'w'));
});

test('balance', async () => {
  mock(() => json({ data: { balance: 51.33 } }));
  assert.deepEqual(await lis.balance(), { balance: 51.33, available: 51.33, frozen: 0 });
});

// ---- buyurtma -> yetkazish ----

test('yetkazish: LIS provayderi bilan paid buyurtma -> sotib olinadi -> sent -> poll -> done', async () => {
  mock((c) => {
    if (c.path === '/market_export_json/csgo.json') return json([{ name: NAME, price: 5, unlocked_price: 5, url: 'x', count: 3 }]);
  });
  const cats = await queryCatalog({ limit: 5 });
  const item = cats.items.find((x) => x.fullName === NAME);

  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: item.id, name: 'x', price: 1, qty: 1, kind: 'skin' }],
  });
  assert.ok(res.order, res.error);
  await updateOrder(res.order.id, { status: 'paid', by: 'test' });

  let state = 'processing';
  const calls = mock((c) => {
    if (c.path === '/v1/user/balance') return json({ data: { balance: 100 } });
    if (c.path === '/v1/market/info') {
      const id = c.query.get('custom_ids[]');
      return json({ data: state === 'processing' && !calls.some((x) => x.path === '/v1/market/buy') ? [] : [purchase(id, state, state === 'accepted' ? { steam_trade_offer_finished_at: '2026-11-19T02:00:00Z' } : {})] });
    }
    if (c.path === '/v1/market/search') return json({ data: [skin(77, item.priceUsd)] });
    if (c.path === '/v1/market/buy') return json({ data: purchase(c.body.custom_id, 'wait_accept') });
  });

  const r = await fulfillOrder(res.order.id);
  assert.equal(r.ok, true, JSON.stringify(r));
  const buyCall = calls.find((c) => c.path === '/v1/market/buy');
  assert.deepEqual(buyCall.body.ids, [77]);
  assert.equal(buyCall.body.partner, '123456789');
  assert.equal(buyCall.body.token, 'AbCd1234');
  // cost rejimi: limit = sotuv narxi + 3%
  assert.ok(Math.abs(buyCall.body.max_price - item.priceUsd * 1.03) < 0.02, `${buyCall.body.max_price} vs ${item.priceUsd}`);

  let o = await getOrder(res.order.id);
  assert.equal(o.status, 'sent');
  assert.equal(o.fulfillment.provider, 'lis');

  state = 'accepted';
  const p = await pollFulfillment(res.order.id);
  assert.equal(p.ok, true, JSON.stringify(p));
  o = await getOrder(res.order.id);
  assert.equal(o.status, 'done');
});

// ---- aniq nusxalar (mahsulot sahifasi "Mavjud nusxalar") ----

const LL = await imp('lib/lisListings.js');

test('toListing: float, naqsh, inspect havola, stikerlar, tezkor yetkazish', () => {
  const l = LL.toListing({
    id: 901, name: NAME, price: 12.5, unlock_at: null, item_float: '0.153456789', item_paint_seed: 661, item_paint_index: 44,
    item_link: 'steam://run/730//+csgo_econ_action_preview%20ABC', delivery_type: 1,
    stickers: [{ name: 'S1', image: 'https://x/s1.png', slot: 0, wear: 0 }],
  });
  assert.equal(l.id, 901);
  assert.equal(l.priceUsd, 12.5); // cost rejimi
  assert.equal(l.price, Math.round(12.5 * 12700));
  assert.equal(l.floatValue, 0.153456789);
  assert.equal(l.paintSeed, 661);
  assert.match(l.inspectLink, /^steam:\/\/run\/730/);
  assert.equal(l.instant, true);
  assert.equal(l.stickers.length, 1);
});

test('toListing: noto\'g\'ri inspect havola (steam:// emas) qabul qilinmaydi; sekin yetkazish', () => {
  const l = LL.toListing({ id: 2, name: NAME, price: 1, item_link: 'https://evil.example/x', delivery_type: 2 });
  assert.equal(l.inspectLink, null);
  assert.equal(l.instant, false);
});

test('getLisListings: qulfli nusxalar tushmaydi, arzondan qimmatga', async () => {
  const calls = mock((c) => {
    if (c.path === '/v1/market/search') {
      return json({ data: [skin(3, 9), skin(1, 5), skin(2, 7, { unlock_at: '2999-01-01T00:00:00Z' }), skin(4, 6)] });
    }
  });
  const out = await LL.getLisListings(NAME);
  assert.deepEqual(out.map((x) => x.id), [1, 4, 3]); // narx: 5, 6, 9 (id 2 qulfli — tushmaydi)
  assert.ok(calls.some((c) => c.path === '/v1/market/search'));
});

test('buyurtma: aniq LIS nusxasi — narx LIS\'dan (klient narxiga ishonilmaydi), listingId saqlanadi', async () => {
  mock((c) => {
    if (c.path === '/v1/market/check-availability') return json({ data: { available_skins: { '555': 8.4 }, unavailable_skin_ids: [] } });
  });
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'lis-555', name: 'AK-47 | Redline', price: 1, qty: 3, kind: 'skin', lisId: 555, marketHashName: NAME }],
  });
  assert.ok(res.order, res.error);
  const it = res.order.items[0];
  assert.equal(it.price, Math.round(8.4 * 12700)); // 1 so'm emas
  assert.equal(it.qty, 1);
  assert.equal(it.listingId, '555');
});

test('buyurtma: sotilgan LIS nusxasi rad etiladi', async () => {
  mock((c) => {
    if (c.path === '/v1/market/check-availability') return json({ data: { available_skins: {}, unavailable_skin_ids: [556] } });
  });
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'lis-556', name: 'x', price: 1, qty: 1, kind: 'skin', lisId: 556, marketHashName: NAME }],
  });
  assert.match(res.error, /sotilgan|mavjud emas/);
});

test('yetkazish: aniq tanlangan LIS nusxasi (id) sotib olinadi, nom bo\'yicha qidirilmaydi', async () => {
  mock((c) => {
    if (c.path === '/v1/market/check-availability') return json({ data: { available_skins: { '557': 8 }, unavailable_skin_ids: [] } });
  });
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'lis-557', name: 'x', price: 1, qty: 1, kind: 'skin', lisId: 557, marketHashName: NAME }],
  });
  assert.ok(res.order, res.error);
  await updateOrder(res.order.id, { status: 'paid', by: 'test' });

  const calls = mock((c) => {
    if (c.path === '/v1/market/info') return json({ data: [] });
    if (c.path === '/v1/user/balance') return json({ data: { balance: 100 } });
    if (c.path === '/v1/market/buy') return json({ data: purchase(c.body.custom_id, 'wait_accept') });
  });
  const r = await fulfillOrder(res.order.id);
  assert.equal(r.ok, true, JSON.stringify(r));
  const buyCall = calls.find((c) => c.path === '/v1/market/buy');
  assert.deepEqual(buyCall.body.ids, [557]);
  assert.equal(calls.some((c) => c.path === '/v1/market/search'), false);
});

// ---- admin katalog (qisqa ro'yxat ustida filtr / sahifalash) ----

const { queryLisList } = await imp('lib/lisAdminCatalog.js');
const SHORT = [
  { name: 'AK-47 | Redline (Field-Tested)', price: 20, unlocked_price: 25, url: 'https://lis-skins.com/market/csgo/a/', count: 10 },
  { name: 'AK-47 | Redline (Minimal Wear)', price: 40, unlocked_price: null, url: 'https://lis-skins.com/market/csgo/b/', count: 3 },
  { name: 'StatTrak™ M4A4 | Howl (Factory New)', price: 9000, unlocked_price: 9500, url: 'x', count: 2 },
  { name: '★ Karambit | Doppler (Factory New)', price: 700, unlocked_price: 720, url: 'https://evil.example/x', count: 5 },
  { name: 'Sticker | Test', price: 1, unlocked_price: 1, url: 'x', count: 99 },
  { name: 'MP9 | Hot Rod (Factory New)', price: 0, unlocked_price: null, url: 'x', count: 4 },
];

test('katalog: stiker va narxsiz nomlar tushmaydi; matched = nusxalar soni, qiymat = narx * soni', () => {
  const r = queryLisList(SHORT, {});
  assert.equal(r.total, 4); // AK x2, Howl, Karambit
  assert.equal(r.matched, 10 + 3 + 2 + 5);
  assert.equal(r.value, 25 * 10 + 40 * 3 + 9500 * 2 + 720 * 5);
  assert.deepEqual(r.weaponCounts, { rifle: 15, knife: 5 });
});

test('katalog: filtrlar (qurol turi, wear, narx, mavjudlik, qidiruv) va saralash', () => {
  assert.equal(queryLisList(SHORT, { weaponType: 'knife' }).total, 1);
  assert.equal(queryLisList(SHORT, { wear: 'Factory New' }).total, 2);
  assert.equal(queryLisList(SHORT, { priceFrom: 100, priceTo: 1000 }).total, 1);
  assert.equal(queryLisList(SHORT, { availability: 'locked' }).items[0].name, 'AK-47 | Redline (Minimal Wear)');
  assert.equal(queryLisList(SHORT, { availability: 'unlocked' }).total, 3);
  assert.equal(queryLisList(SHORT, { query: 'howl' }).total, 1);
  const asc = queryLisList(SHORT, { sort: 'price_asc' }).items.map((i) => i.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.equal(queryLisList(SHORT, { sort: 'count_desc' }).items[0].count, 10);
});

test('katalog: kategoriya sonlari qurol turi filtridan tashqari; rariteti filtri', () => {
  const r = queryLisList(SHORT, { weaponType: 'knife' });
  assert.equal(r.weaponCounts.rifle, 15); // tab sonlari o'zgarmaydi
  assert.equal(r.matched, 5);
  const rar = queryLisList(SHORT, { rarity: 'Covert' }, { rarityOf: (b) => (b.includes('Howl') ? 'Covert' : 'Classified') });
  assert.equal(rar.total, 1);
  assert.equal(queryLisList(SHORT, { rarity: 'Extraordinary' }).items[0].baseName, '★ Karambit | Doppler');
});

test('katalog: LIS bo\'lmagan havola (url) o\'tkazilmaydi; sahifalash', () => {
  const k = queryLisList(SHORT, { weaponType: 'knife' }).items[0];
  assert.equal(k.url, null);
  const many = Array.from({ length: 130 }, (_, i) => ({ name: `AK-47 | Skin${i} (Field-Tested)`, price: i + 1, unlocked_price: i + 1, url: 'x', count: 1 }));
  const p3 = queryLisList(many, { page: 3, sort: 'price_asc' });
  assert.equal(p3.pages, 3);
  assert.equal(p3.items.length, 130 - 96);
  assert.equal(queryLisList(many, { page: 99 }).page, 3); // chegaraga qisiladi
});
