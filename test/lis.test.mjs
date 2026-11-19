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
