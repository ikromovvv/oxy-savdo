// cs2shop adapteri — node:test, soxta fetch bilan (tarmoq va pul yo'q).

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.CS2SHOP_MERCHANT_ID = 'Oxy';
process.env.CS2SHOP_API_KEY = 'cs2_testkey';
process.env.CS2SHOP_MIN_MARGIN_USD = '0.5';

const imp = (rel) => import(pathToFileURL(path.join(process.cwd(), rel)).href);
const cs2 = await imp('lib/fulfill/cs2shop.js');
const feed = await imp('lib/cs2shopFeed.js');

const NAME = 'AK-47 | Redline (Field-Tested)';
const TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=1&token=abc';
const L = (id, price, extra = {}) => ({ listingId: id, market_hash_name: NAME, price, availableAfter: null, ...extra });

// Soxta server: marshrutga qarab javob beradi, so'rovlar jurnali saqlanadi
function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const call = { method: init.method || 'GET', path: u.pathname, query: Object.fromEntries(u.searchParams), body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    const r = await handler(call);
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return calls;
}

const trade = (status, extra = {}) => ({ status, priceUsd: 5, failReason: null, ...extra });

test('buy: eng arzon mavjud listingni sotib oladi, ref = customId', async () => {
  const calls = mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') {
      return { body: { items: [L('b', 6), L('a', 5), L('locked', 1, { availableAfter: '2999-01-01T00:00:00Z' }), L('x', 2, { market_hash_name: 'Boshqa' })], total: 4 } };
    }
    if (c.path === '/v1/merchant/trades') return { body: trade('PENDING') };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, maxPriceUSD: 9.27, tradeUrl: TRADE_URL, customId: 'OXY-AAAAAA-ak-0' });
  assert.equal(r.ok, true);
  assert.equal(r.providerRef, 'OXY-AAAAAA-ak-0');
  assert.equal(r.state, 'processing');
  const post = calls.find((c) => c.method === 'POST');
  assert.equal(post.body.listingId, 'a');
  assert.equal(post.body.externalRef, 'OXY-AAAAAA-ak-0');
  assert.equal(post.body.tradeUrl, TRADE_URL);
  assert.ok(post.body.expectedPriceUsd >= 5 && post.body.expectedPriceUsd <= 8.5);
});

test('buy: narx sotuv narxi - marjadan oshsa sotib olmaydi (zarar ko\'rmaslik)', async () => {
  const calls = mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 9)], total: 1 } };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R1' });
  assert.equal(r.ok, false);
  assert.match(r.error, /narxi oshib ketdi/);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0);
});

test('buy: mavjud emas / faqat qulflangan -> xato, POST yo\'q', async () => {
  const calls = mockFetch((c) => ({ body: { items: [L('locked', 3, { availableAfter: '2999-01-01T00:00:00Z' })], total: 1 } }));
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R2' });
  assert.equal(r.ok, false);
  assert.match(r.error, /mavjud emas/);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0);
});

test('buy: price_changed -> keyingi nomzod listing sinaladi', async () => {
  let posts = 0;
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5), L('b', 5.5)], total: 2 } };
    posts++;
    if (c.body.listingId === 'a') return { status: 400, body: { error: 'price_changed', message: 'Price has changed to 7' } };
    return { body: trade('SENT') };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R3' });
  assert.equal(r.ok, true);
  assert.equal(r.state, 'sent');
  assert.equal(posts, 2);
});

test('buy: insufficient_balance -> aniq xabar, qayta urinmaydi', async () => {
  let posts = 0;
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5)], total: 1 } };
    posts++;
    return { status: 400, body: { error: 'insufficient_balance', message: 'x' } };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R4' });
  assert.equal(r.ok, false);
  assert.match(r.error, /balansida/);
  assert.equal(posts, 1);
});

test('buy: duplicate_external_ref + COMPLETED -> mavjud buyurtma qabul qilinadi (ikkinchi marta sotib olinmaydi)', async () => {
  const refs = [];
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5)], total: 1 } };
    if (c.path === '/v1/merchant/trades') { refs.push(c.body.externalRef); return { status: 400, body: { error: 'duplicate_external_ref', message: 'x' } }; }
    if (c.path === '/v1/merchant/trades/by-external-ref') return { body: trade('COMPLETED') };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R5' });
  assert.equal(r.ok, true);
  assert.equal(r.state, 'done');
  assert.deepEqual(refs, ['R5']);
});

test('buy: oldingi urinish FAILED bo\'lsa — yangi ref (~2) bilan qayta sotib oladi', async () => {
  const refs = [];
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5)], total: 1 } };
    if (c.path === '/v1/merchant/trades') {
      refs.push(c.body.externalRef);
      return c.body.externalRef === 'R6' ? { status: 400, body: { error: 'duplicate_external_ref' } } : { body: trade('PENDING') };
    }
    if (c.path === '/v1/merchant/trades/by-external-ref') return { body: trade('FAILED', { failReason: 'UZUM BANK is not available to trade' }) };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R6' });
  assert.equal(r.ok, true);
  assert.equal(r.providerRef, 'R6~2');
  assert.deepEqual(refs, ['R6', 'R6~2']);
});

test('buy: oldingi buyurtma REVERSED bo\'lsa — QAYTA sotib OLMAYDI, qo\'lda tekshirish', async () => {
  let posts = 0;
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5)], total: 1 } };
    if (c.path === '/v1/merchant/trades') { posts++; return { status: 400, body: { error: 'duplicate_external_ref' } }; }
    if (c.path === '/v1/merchant/trades/by-external-ref') return { body: trade('REVERSED', { failReason: 'Trade was reversed by Buyer after completion' }) };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R7' });
  assert.equal(r.ok, false);
  assert.match(r.error, /REVERSED/);
  assert.equal(posts, 1);
});

test('buy: 500 -> avval lookup; buyurtma yaratilgan bo\'lsa uni qabul qiladi', async () => {
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5)], total: 1 } };
    if (c.path === '/v1/merchant/trades') return { status: 500, body: { error: 'internal_error' } };
    if (c.path === '/v1/merchant/trades/by-external-ref') return { body: trade('PENDING') };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R8' });
  assert.equal(r.ok, true);
  assert.equal(r.providerRef, 'R8');
});

test('buy: 500 va lookup 404 -> xato (keyingi tick shu ref bilan qayta urinadi)', async () => {
  mockFetch((c) => {
    if (c.path === '/v1/merchant/listings') return { body: { items: [L('a', 5)], total: 1 } };
    if (c.path === '/v1/merchant/trades') return { status: 500, body: { error: 'internal_error' } };
    return { status: 404, body: { error: 'trade_not_found' } };
  });
  const r = await cs2.buy({ marketHashName: NAME, salePriceUSD: 9, tradeUrl: TRADE_URL, customId: 'R9' });
  assert.equal(r.ok, false);
});

test('status: cs2shop holatlari bizning holatlarga o\'giriladi', async () => {
  const cases = [['PENDING', 'processing'], ['SENT', 'sent'], ['COMPLETED', 'done'], ['FAILED', 'error'], ['EXPIRED', 'error'], ['CANCELLED', 'error'], ['REVERSED', 'error']];
  for (const [from, to] of cases) {
    mockFetch(() => ({ body: trade(from) }));
    assert.equal((await cs2.status('ref')).state, to, from);
  }
  mockFetch(() => ({ status: 404, body: { error: 'trade_not_found' } }));
  assert.equal((await cs2.status('ref')).state, 'error');
  mockFetch(() => ({ status: 503, body: { error: 'maintenance' } }));
  assert.equal((await cs2.status('ref')).state, 'processing'); // vaqtinchalik — qayta so'raymiz
});

test('webhook imzosi: to\'g\'ri HMAC o\'tadi, noto\'g\'ri/yo\'q rad etiladi', () => {
  const body = Buffer.from(JSON.stringify({ tradeId: 't', externalId: 'OXY-AAAAAA-x-0', status: 'COMPLETED' }));
  const sig = crypto.createHmac('sha256', 'cs2_testkey').update(body).digest('hex');
  assert.equal(cs2.verifyWebhook(body, sig), true);
  assert.equal(cs2.verifyWebhook(body, sig.replace(/.$/, sig.endsWith('0') ? '1' : '0')), false);
  assert.equal(cs2.verifyWebhook(body, ''), false);
  assert.equal(cs2.verifyWebhook(Buffer.from('{}'), sig), false);
});

// ---- katalog jamlash ----

test('aggregate: nom bo\'yicha eng arzon, qulflanmagan listing; sotuv narxi pricing bilan', () => {
  const out = feed.aggregate([
    L('a', 5), L('b', 3), L('c', 1, { availableAfter: '2999-01-01T00:00:00Z' }),
    L('d', 20, { market_hash_name: 'M4A4 | Howl (Factory New)' }),
  ]);
  assert.equal(out.length, 2);
  const ak = out.find((x) => x.market_hash_name === NAME);
  assert.equal(ak.costUsd, 3);
  assert.equal(ak.listingId, 'b');
  assert.equal(ak.quantity, 2); // qulflangan hisoblanmaydi
  assert.ok(ak.min_price >= 3 + 1.5); // tannarx + minimal foyda
});

test('aggregate: override sotuv narxiga ta\'sir qiladi', () => {
  const plain = feed.aggregate([L('a', 3)])[0].min_price;
  const bumped = feed.aggregate([L('a', 3)], { [NAME]: { addUsd: 2 } })[0].min_price;
  assert.ok(bumped > plain);
});
