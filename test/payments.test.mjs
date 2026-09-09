// To'lov callback testlari — node:test (tashqi kutubxonasiz).
//   npm test   yoki   node --test test/
//
// DB/KV env yo'q -> orderStore fayl rejimida (<tmp>/data/orders.json).
// Test boshida cwd vaqtinchalik papkaga ko'chiriladi, shunda haqiqiy loyiha
// data/ papkasiga tegilmaydi. Skinlar tarmoq talab qiladi — testlarda faqat
// katalogdagi "seed" mahsulot (oxy-speed, 340 000 so'm) ishlatiladi.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// --- izolyatsiya: vaqtinchalik cwd + test env (import'dan OLDIN) ---
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-test-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
process.chdir(TMP);

process.env.PAYME_KEY = 'test-payme-key';
process.env.PAYME_MERCHANT_ID = 'test-merchant';
process.env.CLICK_SECRET_KEY = 'test-click-secret';
process.env.CLICK_SERVICE_ID = '1';
process.env.CLICK_MERCHANT_ID = '1';
process.env.ORDER_MIN_UZS = '1000';
process.env.ORDER_MAX_UZS = '100000000';
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

const PROJECT = path.resolve(import.meta.dirname, '..');
const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);
const { createOrder, getOrder, markOrderPaid } = await imp('lib/orderStore.js');
const { handlePayme } = await imp('lib/pay/payme.js');
const { handleClickPrepare, handleClickComplete } = await imp('lib/pay/click.js');

// --- yordamchilar ---
const PRODUCT_ID = 'oxy-speed'; // seed katalogdan, 340 000 so'm

async function makeOrder(extra = {}) {
  const res = await createOrder({
    name: 'Test',
    phone: '+998900000000',
    items: [{ id: PRODUCT_ID, name: 'x', price: 1, qty: 1, kind: 'product' }],
    ...extra,
  });
  assert.ok(res.order, `buyurtma yaratilishi kerak edi: ${res.error}`);
  return res.order;
}

function paymeAuth() {
  return 'Basic ' + Buffer.from('Paycom:test-payme-key').toString('base64');
}
function payme(method, params, id = 1) {
  return handlePayme({ authHeader: paymeAuth(), body: { jsonrpc: '2.0', id, method, params } });
}
function clickSign(p, withPrepare) {
  const base =
    String(p.click_trans_id) +
    String(p.service_id) +
    'test-click-secret' +
    String(p.merchant_trans_id) +
    (withPrepare ? String(p.merchant_prepare_id) : '') +
    String(p.amount) +
    String(p.action) +
    String(p.sign_time);
  return crypto.createHash('md5').update(base, 'utf8').digest('hex');
}

// =====================  NARX AVTORITETI + CHEGARALAR  =====================

test('createOrder: client narxi e\'tiborsiz — server narxi qo\'llanadi', async () => {
  const order = await makeOrder({
    items: [{ id: PRODUCT_ID, name: 'spoof', price: 999999999, qty: 1, kind: 'product' }],
  });
  assert.equal(order.total, 340000);
  assert.equal(order.items[0].price, 340000);
});

test('createOrder: noma\'lum mahsulot rad etiladi', async () => {
  const res = await createOrder({
    name: 'T', phone: '1',
    items: [{ id: 'yoq-bunday-mahsulot', name: 'x', price: 100, qty: 1, kind: 'product' }],
  });
  assert.ok(res.error);
  assert.equal(res.order, undefined);
});

test('createOrder: bo\'sh savat rad etiladi', async () => {
  const res = await createOrder({ name: 'T', phone: '1', items: [] });
  assert.ok(res.error);
});

// =====================  PAYME  =====================

test('payme: noto\'g\'ri auth -> -32504', async () => {
  const r = await handlePayme({
    authHeader: 'Basic ' + Buffer.from('Paycom:notmykey').toString('base64'),
    body: { jsonrpc: '2.0', id: 1, method: 'CheckPerformTransaction', params: { account: { order_id: 'X' }, amount: 1 } },
  });
  assert.equal(r.error.code, -32504);
});

test('payme: noma\'lum buyurtma -> -31050', async () => {
  const r = await payme('CheckPerformTransaction', { account: { order_id: 'OXY-YOQ99' }, amount: 100 });
  assert.equal(r.error.code, -31050);
});

test('payme: noto\'g\'ri summa -> -31001', async () => {
  const order = await makeOrder();
  const r = await payme('CheckPerformTransaction', { account: { order_id: order.ref }, amount: 12345 });
  assert.equal(r.error.code, -31001);
});

test('payme: to\'g\'ri CheckPerform -> allow:true', async () => {
  const order = await makeOrder();
  const r = await payme('CheckPerformTransaction', {
    account: { order_id: order.ref }, amount: order.total * 100,
  });
  assert.deepEqual(r.result, { allow: true });
});

test('payme: to\'liq oqim Create -> Perform -> paid', async () => {
  const order = await makeOrder();
  const amount = order.total * 100;
  const txnId = 'pm-' + Date.now();

  const c = await payme('CreateTransaction', { id: txnId, time: Date.now(), amount, account: { order_id: order.ref } });
  assert.equal(c.result.state, 1);

  const p = await payme('PerformTransaction', { id: txnId });
  assert.equal(p.result.state, 2);

  const fresh = await getOrder(order.id);
  assert.equal(fresh.status, 'paid');
  assert.equal(fresh.payment.status, 'paid');
});

test('payme: takroriy PerformTransaction ikki marta to\'lamaydi', async () => {
  const order = await makeOrder();
  const amount = order.total * 100;
  const txnId = 'pm-dup-' + Date.now();
  await payme('CreateTransaction', { id: txnId, time: Date.now(), amount, account: { order_id: order.ref } });

  const p1 = await payme('PerformTransaction', { id: txnId });
  const p2 = await payme('PerformTransaction', { id: txnId });
  assert.equal(p1.result.state, 2);
  assert.equal(p2.result.state, 2);
  assert.equal(p2.error, undefined);

  const fresh = await getOrder(order.id);
  // paid holatga o'tgan bitta tarix yozuvi bo'lishi kerak
  assert.equal(fresh.history.filter((h) => h.status === 'paid').length, 1);
});

test('payme: CancelTransaction -> failed', async () => {
  const order = await makeOrder();
  const amount = order.total * 100;
  const txnId = 'pm-cancel-' + Date.now();
  await payme('CreateTransaction', { id: txnId, time: Date.now(), amount, account: { order_id: order.ref } });

  const r = await payme('CancelTransaction', { id: txnId, reason: 3 });
  assert.equal(r.result.state, -1);
  const fresh = await getOrder(order.id);
  assert.equal(fresh.payment.status, 'failed');
});

// =====================  markOrderPaid idempotentligi  =====================

test('markOrderPaid: bir xil (provider, txn) ikkinchi marta -> duplicate', async () => {
  const order = await makeOrder();
  const r1 = await markOrderPaid(order.id, { provider: 'payme', providerTxnId: 'guard-1', by: 'payme' });
  const r2 = await markOrderPaid(order.id, { provider: 'payme', providerTxnId: 'guard-1', by: 'payme' });
  assert.equal(r1.duplicate, undefined);
  assert.equal(r2.duplicate, true);
});

// =====================  CLICK  =====================

test('click prepare: yomon imzo -> -1', async () => {
  const order = await makeOrder();
  const p = {
    click_trans_id: 'ct1', service_id: '1', merchant_trans_id: order.ref,
    amount: String(order.total), action: '0', sign_time: '2026-01-01 00:00:00',
    sign_string: 'deadbeef',
  };
  const r = await handleClickPrepare(p);
  assert.equal(r.error, -1);
});

test('click prepare: noma\'lum buyurtma -> -5', async () => {
  const p = {
    click_trans_id: 'ct2', service_id: '1', merchant_trans_id: 'OXY-YOQ',
    amount: '340000', action: '0', sign_time: '2026-01-01 00:00:00',
  };
  p.sign_string = clickSign(p, false);
  const r = await handleClickPrepare(p);
  assert.equal(r.error, -5);
});

test('click prepare: noto\'g\'ri summa -> -2', async () => {
  const order = await makeOrder();
  const p = {
    click_trans_id: 'ct3', service_id: '1', merchant_trans_id: order.ref,
    amount: '999', action: '0', sign_time: '2026-01-01 00:00:00',
  };
  p.sign_string = clickSign(p, false);
  const r = await handleClickPrepare(p);
  assert.equal(r.error, -2);
});

test('click: prepare -> complete -> paid, va takroriy complete ikki marta to\'lamaydi', async () => {
  const order = await makeOrder();
  const prep = {
    click_trans_id: 'ct-full-' + Date.now(), service_id: '1', merchant_trans_id: order.ref,
    amount: String(order.total), action: '0', sign_time: '2026-01-01 00:00:00',
  };
  prep.sign_string = clickSign(prep, false);
  const pr = await handleClickPrepare(prep);
  assert.equal(pr.error, 0);

  const comp = { ...prep, action: '1', merchant_prepare_id: pr.merchant_prepare_id };
  comp.sign_string = clickSign(comp, true);

  const c1 = await handleClickComplete(comp);
  const c2 = await handleClickComplete(comp);
  assert.equal(c1.error, 0);
  assert.equal(c2.error, 0);

  const fresh = await getOrder(order.id);
  assert.equal(fresh.payment.status, 'paid');
  assert.equal(fresh.history.filter((h) => h.status === 'paid').length, 1);
});

test('click complete: noto\'g\'ri summa -> -2', async () => {
  const order = await makeOrder();
  const prep = {
    click_trans_id: 'ct-wa-' + Date.now(), service_id: '1', merchant_trans_id: order.ref,
    amount: String(order.total), action: '0', sign_time: '2026-01-01 00:00:00',
  };
  prep.sign_string = clickSign(prep, false);
  const pr = await handleClickPrepare(prep);

  const comp = { ...prep, action: '1', amount: '111', merchant_prepare_id: pr.merchant_prepare_id };
  comp.sign_string = clickSign(comp, true);
  const r = await handleClickComplete(comp);
  assert.equal(r.error, -2);
});

test('click complete: error<0 (bekor) -> to\'lov failed, buyurtma paid emas', async () => {
  const order = await makeOrder();
  const prep = {
    click_trans_id: 'ct-fail-' + Date.now(), service_id: '1', merchant_trans_id: order.ref,
    amount: String(order.total), action: '0', sign_time: '2026-01-01 00:00:00',
  };
  prep.sign_string = clickSign(prep, false);
  const pr = await handleClickPrepare(prep);

  const comp = {
    ...prep, action: '1', error: '-1', error_note: 'cancelled',
    merchant_prepare_id: pr.merchant_prepare_id,
  };
  comp.sign_string = clickSign(comp, true);
  const r = await handleClickComplete(comp);
  assert.equal(r.error, 0); // Click'ga OK qaytaramiz

  const fresh = await getOrder(order.id);
  assert.equal(fresh.payment.status, 'failed');
  assert.notEqual(fresh.status, 'paid');
});

test.after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});
