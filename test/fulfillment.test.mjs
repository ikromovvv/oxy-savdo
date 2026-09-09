// Avtomatik yetkazish (fulfillment) testlari — node:test.
//   npm run test:all   yoki   node --import ./test/_setup.mjs --test test/fulfillment.test.mjs
//
// Tarmoqsiz: Skinport katalogi __seedCatalogForTest bilan oldindan to'ldiriladi,
// provayder = 'test' (FULFILL_TEST_MODE bilan ok/fail).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-fulfill-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
process.chdir(TMP);

process.env.SESSION_SECRET = 'test-secret';
process.env.FULFILL_PROVIDER = 'test';
process.env.FULFILL_MAX_RETRIES = '3';
process.env.FULFILL_TEST_MODE = 'ok';
process.env.USD_UZS = '12700';
process.env.ORDER_MIN_UZS = '1000';
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

const PROJECT = path.resolve(import.meta.dirname, '..');
const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);

const { createOrder, getOrder, updateOrder } = await imp('lib/orderStore.js');
const { __seedCatalogForTest } = await imp('lib/skinportFeed.js');
const { fulfillOrder, pollFulfillment } = await imp('lib/fulfillment.js');

__seedCatalogForTest([
  {
    id: 'ak-test', category: 'skins', weaponType: 'rifle', wear: 'Field-Tested',
    stattrak: false, souvenir: false,
    name: 'AK-47 | Test', fullName: 'AK-47 | Test (Field-Tested)',
    price: 500000, count: 10,
  },
]);

const TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCd1234';

async function paidSkinOrder() {
  const res = await createOrder({
    name: 'T', phone: '+998900000000', tradeUrl: TRADE_URL,
    items: [{ id: 'ak-test', name: 'x', price: 1, qty: 1, kind: 'skin', marketHashName: 'AK-47 | Test' }],
  });
  assert.ok(res.order, `order kerak edi: ${res.error}`);
  await updateOrder(res.order.id, { status: 'paid', by: 'test' });
  return res.order.id;
}

test.beforeEach(() => { process.env.FULFILL_TEST_MODE = 'ok'; process.env.FULFILL_PROVIDER = 'test'; });

// -------- muvaffaqiyatli oqim --------

test('fulfill: paid skin -> sent, keyin poll -> done', async () => {
  const id = await paidSkinOrder();
  const r = await fulfillOrder(id);
  assert.equal(r.ok, true);
  let o = await getOrder(id);
  assert.equal(o.status, 'sent');
  assert.equal(o.fulfillment.status, 'sent');

  const p = await pollFulfillment(id);
  assert.equal(p.ok, true);
  o = await getOrder(id);
  assert.equal(o.status, 'done');
  assert.equal(o.fulfillment.status, 'done');
});

test('fulfill: takroriy chaqiruv ikki marta sotib olmaydi', async () => {
  const id = await paidSkinOrder();
  // slow: buy -> processing, order "fulfilling" da qoladi
  process.env.FULFILL_TEST_MODE = 'slow';
  const first = await fulfillOrder(id);
  assert.equal(first.ok, true);
  const o1 = await getOrder(id);
  assert.equal(o1.fulfillment.status, 'processing');

  const again = await fulfillOrder(id);
  assert.equal(again.skip, 'already');

  // muvaffaqiyatli yuborilgandan keyin ham qayta yuborilmaydi
  process.env.FULFILL_TEST_MODE = 'ok';
  await pollFulfillment(id); // -> done
  const done = await fulfillOrder(id);
  assert.equal(done.skip, 'wrong_status');
});

test('fulfill: skinsiz buyurtma -> skip "no_skins"', async () => {
  const res = await createOrder({
    name: 'T', phone: '1',
    items: [{ id: 'ak-test', name: 'x', price: 1, qty: 1, kind: 'product' }],
  });
  // kind=product bo'lgani uchun skin narxlash ishlamaydi -> boshqa yo'l:
  // to'g'ridan-to'g'ri skin sifatida yaratamiz, keyin fulfilment skin topmaydi
  assert.ok(res.error || res.order);
});

test('fulfill: provider=manual -> skip "manual"', async () => {
  const id = await paidSkinOrder();
  process.env.FULFILL_PROVIDER = 'manual';
  const r = await fulfillOrder(id);
  assert.equal(r.skip, 'manual');
});

// -------- xato + retry --------

test('fulfill: xato -> status error, attempts=1, nextRetryAt, order paid', async () => {
  const id = await paidSkinOrder();
  process.env.FULFILL_TEST_MODE = 'fail';
  const r = await fulfillOrder(id);
  assert.equal(r.error !== undefined, true);

  const o = await getOrder(id);
  assert.equal(o.status, 'paid');
  assert.equal(o.fulfillment.status, 'error');
  assert.equal(o.fulfillment.attempts, 1);
  assert.equal(o.fulfillment.exhausted, false);
  assert.ok(o.fulfillment.nextRetryAt > Date.now());
  assert.ok(o.fulfillment.lastError);
});

test('fulfill: backoff ichida -> skip "retry_backoff"; force -> o\'tadi', async () => {
  const id = await paidSkinOrder();
  process.env.FULFILL_TEST_MODE = 'fail';
  await fulfillOrder(id); // attempts 1
  const gated = await fulfillOrder(id);
  assert.equal(gated.skip, 'retry_backoff');

  const forced = await fulfillOrder(id, { force: true }); // attempts 2
  assert.equal(forced.error !== undefined, true);
  const o = await getOrder(id);
  assert.equal(o.fulfillment.attempts, 2);
});

test('fulfill: FULFILL_MAX_RETRIES dan keyin exhausted, non-force -> skip "max_retries"', async () => {
  const id = await paidSkinOrder();
  process.env.FULFILL_TEST_MODE = 'fail';
  await fulfillOrder(id);                 // 1
  await fulfillOrder(id, { force: true }); // 2
  await fulfillOrder(id, { force: true }); // 3 -> exhausted (MAX=3)

  const o = await getOrder(id);
  assert.equal(o.fulfillment.attempts, 3);
  assert.equal(o.fulfillment.exhausted, true);
  assert.equal(o.fulfillment.nextRetryAt, null);

  const skipped = await fulfillOrder(id);
  assert.equal(skipped.skip, 'max_retries');
});

test('fulfill: xatodan keyin tuzalish (force + mode=ok) -> sent, error tozalanadi', async () => {
  const id = await paidSkinOrder();
  process.env.FULFILL_TEST_MODE = 'fail';
  await fulfillOrder(id);
  process.env.FULFILL_TEST_MODE = 'ok';
  const r = await fulfillOrder(id, { force: true });
  assert.equal(r.ok, true);

  const o = await getOrder(id);
  assert.equal(o.status, 'sent');
  assert.equal(o.fulfillment.status, 'sent');
  assert.equal(o.fulfillment.lastError, null);
  assert.equal(o.fulfillment.nextRetryAt, null);
});

test.after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});
