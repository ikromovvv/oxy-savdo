// Hamyon (balans) testlari — node:test, tarmoqsiz, lokal fayl rejimi.
// Asosiy kafolatlar: balans faqat server tomonda o'zgaradi, takroriy callback
// ikki marta qo'shmaydi, balans manfiy bo'lmaydi, xarid atomik.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-wallet-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
process.chdir(TMP);

process.env.SESSION_SECRET = 'test-secret';
process.env.FULFILL_PROVIDER = 'manual';
process.env.ORDER_MIN_UZS = '1000';
process.env.DEPOSIT_MIN_UZS = '10000';
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

const PROJECT = path.resolve(import.meta.dirname, '..');
const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);

const { createOrder, createDepositOrder, getOrder, markOrderPaid, updateOrder } = await imp('lib/orderStore.js');
const { getBalance, getWallet, creditWallet, debitWallet } = await imp('lib/walletStore.js');
const { settlePaidOrder, payOrderWithWallet, refundWalletOrder, recoverDeposits } = await imp('lib/settle.js');
const { handlePayme } = await imp('lib/pay/payme.js');
const { handleClickPrepare, handleClickComplete } = await imp('lib/pay/click.js');
const { availableProviders, createPayment } = await imp('lib/payments.js');
process.env.PAYME_KEY = 'k';

let n = 0;
const STEAM = () => ({ steamid: `7656119900000${String(++n).padStart(4, '0')}`, name: 'Nick', profileUrl: '' });

async function paidDeposit(steam, amount, provider = 'payme', txn = 't' + Math.random()) {
  const { order } = await createDepositOrder({ steam, amount });
  await markOrderPaid(order.id, { provider, providerTxnId: txn, performTime: Date.now() });
  return order;
}

// -------- to'ldirish --------

test('deposit: summa chegaralari (min / max / manfiy) rad etiladi', async () => {
  const s = STEAM();
  assert.ok((await createDepositOrder({ steam: s, amount: 5 })).error);
  assert.ok((await createDepositOrder({ steam: s, amount: -50000 })).error);
  assert.ok((await createDepositOrder({ steam: s, amount: 'abc' })).error);
  assert.ok((await createDepositOrder({ steam: s, amount: 1e12 })).error);
  assert.ok((await createDepositOrder({ steam: null, amount: 50000 })).error); // Steam kerak
});

test('deposit: to\'lanmagan buyurtma balansni o\'zgartirmaydi', async () => {
  const s = STEAM();
  const { order } = await createDepositOrder({ steam: s, amount: 50000 });
  const r = await settlePaidOrder(order.id);
  assert.equal(r.skip, 'not_paid');
  assert.equal(await getBalance(s.steamid), 0);
});

test('deposit: to\'langach hamyonga tushadi, buyurtma "done" bo\'ladi', async () => {
  const s = STEAM();
  const o = await paidDeposit(s, 100000);
  await settlePaidOrder(o.id);
  assert.equal(await getBalance(s.steamid), 100000);
  assert.equal((await getOrder(o.id)).status, 'done');
});

test('deposit: takroriy settle (qayta callback) ikki marta qo\'shmaydi', async () => {
  const s = STEAM();
  const o = await paidDeposit(s, 70000);
  await Promise.all([settlePaidOrder(o.id), settlePaidOrder(o.id), settlePaidOrder(o.id)]);
  await settlePaidOrder(o.id);
  assert.equal(await getBalance(s.steamid), 70000);
  assert.equal((await getWallet(s.steamid)).txns.filter((t) => t.kind === 'deposit').length, 1);
});

test('deposit: Payme PerformTransaction ikki marta kelsa ham balans bir marta oshadi', async () => {
  const s = STEAM();
  const { order } = await createDepositOrder({ steam: s, amount: 40000 });
  const auth = 'Basic ' + Buffer.from('Paycom:k').toString('base64');
  const call = (method, params) => handlePayme({ authHeader: auth, body: { jsonrpc: '2.0', id: 1, method, params } });
  const txn = 'pm-dep-' + Math.random();
  await call('CreateTransaction', { id: txn, time: Date.now(), amount: 4000000, account: { order_id: order.ref } });
  await call('PerformTransaction', { id: txn });
  await call('PerformTransaction', { id: txn });
  assert.equal(await getBalance(s.steamid), 40000);
});

test('deposit: recoverDeposits to\'lov o\'tgan-u hamyonga yozilmay qolganini tuzatadi', async () => {
  const s = STEAM();
  await paidDeposit(s, 25000); // settle chaqirilmagan (callback o'rtasida yiqilgan holat)
  assert.equal(await getBalance(s.steamid), 0);
  const r = await recoverDeposits();
  assert.ok(r.fixed >= 1);
  assert.equal(await getBalance(s.steamid), 25000);
});

// -------- ledger primitivlari --------

test('debit: balans yetmasa rad etiladi va o\'zgarmaydi; manfiy bo\'lmaydi', async () => {
  const s = STEAM();
  await creditWallet({ steamid: s.steamid, amount: 10000, key: 'k1' });
  const d = await debitWallet({ steamid: s.steamid, amount: 10001, key: 'd1' });
  assert.equal(d.ok, false);
  assert.equal(d.error, 'insufficient');
  assert.equal(await getBalance(s.steamid), 10000);
});

test('ledger: noto\'g\'ri argumentlar (0, manfiy, kalitsiz) rad etiladi', async () => {
  const s = STEAM();
  assert.equal((await creditWallet({ steamid: s.steamid, amount: 0, key: 'z' })).ok, false);
  assert.equal((await creditWallet({ steamid: s.steamid, amount: -500, key: 'z' })).ok, false);
  assert.equal((await creditWallet({ steamid: s.steamid, amount: 500 })).ok, false);
  assert.equal(await getBalance(s.steamid), 0);
});

test('debit: bir vaqtda ko\'p yechish — balansdan ko\'p ketmaydi', async () => {
  const s = STEAM();
  await creditWallet({ steamid: s.steamid, amount: 30000, key: 'seed' });
  const results = await Promise.all(
    Array.from({ length: 6 }, (_, i) => debitWallet({ steamid: s.steamid, amount: 10000, key: 'race' + i }))
  );
  assert.equal(results.filter((r) => r.ok).length, 3);
  assert.equal(await getBalance(s.steamid), 0);
});

// -------- balansdan xarid --------

async function depositedUser(amount) {
  const s = STEAM();
  await creditWallet({ steamid: s.steamid, amount, key: 'seed:' + s.steamid });
  return s;
}

// kovrik (jismoniy mahsulot): Steam bilan, telefon bilan
async function padOrder(s) {
  const r = await createOrder({
    name: 'Nick', phone: '+998901112233', steam: s,
    items: [{ id: 'oxy-speed', name: 'x', price: 1, qty: 1, kind: 'product' }], // 340 000
  });
  assert.ok(r.order, r.error);
  return r.order;
}

test('xarid: balans yetarli -> yechiladi, buyurtma paid, provayder "wallet"', async () => {
  const s = await depositedUser(500000);
  const o = await padOrder(s);
  const r = await payOrderWithWallet(o);
  assert.equal(r.ok, true);
  assert.equal(await getBalance(s.steamid), 160000);
  const fresh = await getOrder(o.id);
  assert.equal(fresh.status, 'paid');
  assert.equal(fresh.payment.provider, 'wallet');
  assert.equal(fresh.payment.status, 'paid');
});

test('xarid: balans yetmasa -> yechilmaydi, buyurtma paid bo\'lmaydi', async () => {
  const s = await depositedUser(100000);
  const o = await padOrder(s);
  const r = await payOrderWithWallet(o);
  assert.equal(r.ok, false);
  assert.equal(await getBalance(s.steamid), 100000);
  assert.notEqual((await getOrder(o.id)).payment.status, 'paid');
});

test('xarid: bir buyurtma ikki marta to\'lansa pul bir marta yechiladi', async () => {
  const s = await depositedUser(1000000);
  const o = await padOrder(s);
  await Promise.all([payOrderWithWallet(o), payOrderWithWallet(o)]);
  assert.equal(await getBalance(s.steamid), 660000);
});

test('xarid: Steam\'siz buyurtma balansdan to\'lay olmaydi; deposit ham', async () => {
  const noSteam = await createOrder({
    name: 'A', phone: '+998901112233',
    items: [{ id: 'oxy-speed', name: 'x', price: 1, qty: 1, kind: 'product' }],
  });
  assert.equal((await payOrderWithWallet(noSteam.order)).ok, false);
  const s = await depositedUser(900000);
  const { order: dep } = await createDepositOrder({ steam: s, amount: 50000 });
  assert.equal((await payOrderWithWallet(dep)).ok, false);
});

test('qaytarish: balansdan to\'langan buyurtma bekor qilinsa pul qaytadi (bir marta)', async () => {
  const s = await depositedUser(400000);
  const o = await padOrder(s);
  await payOrderWithWallet(o);
  assert.equal(await getBalance(s.steamid), 60000);
  const before = await getOrder(o.id);
  await updateOrder(o.id, { status: 'cancelled', by: 'admin' });
  await refundWalletOrder(before);
  await refundWalletOrder(before);
  assert.equal(await getBalance(s.steamid), 400000);
});

test('qaytarish: balansdan to\'lanmagan buyurtma uchun hamyonga hech narsa qo\'shilmaydi', async () => {
  const s = STEAM();
  const o = await padOrder(s);
  await markOrderPaid(o.id, { provider: 'payme', providerTxnId: 'pm-x' });
  const r = await refundWalletOrder(await getOrder(o.id));
  assert.equal(r.skip, true);
  assert.equal(await getBalance(s.steamid), 0);
});

test('har foydalanuvchi o\'z hamyoni: boshqasining balansiga tegmaydi', async () => {
  const a = await depositedUser(50000);
  const b = await depositedUser(70000);
  await debitWallet({ steamid: a.steamid, amount: 20000, key: 'iso-a' });
  assert.equal(await getBalance(a.steamid), 30000);
  assert.equal(await getBalance(b.steamid), 70000);
});

// -------- Payme / Click orqali avtomatik to'ldirish --------

function withEnv(vars, fn) {
  const old = {};
  for (const k of Object.keys(vars)) { old[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; }
  const restore = () => { for (const k of Object.keys(old)) { if (old[k] == null) delete process.env[k]; else process.env[k] = old[k]; } };
  return Promise.resolve(fn()).finally(restore);
}
const PAYME_ENV = { PAYME_MERCHANT_ID: 'm1', PAYME_KEY: 'k' };
const CLICK_ENV = { CLICK_SERVICE_ID: '7', CLICK_MERCHANT_ID: '9', CLICK_SECRET_KEY: 'sec' };
const NONE_ENV = { PAYME_MERCHANT_ID: null, PAYME_KEY: null, CLICK_SERVICE_ID: null, CLICK_MERCHANT_ID: null, CLICK_SECRET_KEY: null, PAYMENT_PROVIDER: null };

test(`providers: kalit yo'q -> usul yo'q; Payme/Click sozlansa ikkalasi ham tanlanadi`, async () => {
  await withEnv(NONE_ENV, () => assert.deepEqual(availableProviders(), []));
  await withEnv({ ...NONE_ENV, ...PAYME_ENV }, () => assert.deepEqual(availableProviders(), ['payme']));
  await withEnv({ ...NONE_ENV, ...PAYME_ENV, ...CLICK_ENV }, () => assert.deepEqual(availableProviders(), ['payme', 'click']));
});

test(`providers: createPayment tanlangan provayder havolasini beradi; noma'lum qiymat e'tiborsiz`, async () => {
  const s = STEAM();
  const { order } = await createDepositOrder({ steam: s, amount: 60000 });
  await withEnv({ ...NONE_ENV, ...PAYME_ENV, ...CLICK_ENV }, () => {
    const pm = createPayment(order, 'https://oxy.uz', 'payme');
    assert.equal(pm.provider, 'payme');
    assert.ok(pm.payUrl.startsWith('https://checkout.paycom.uz/'));
    const ck = createPayment(order, 'https://oxy.uz', 'click');
    assert.equal(ck.provider, 'click');
    assert.ok(ck.payUrl.includes('my.click.uz') && ck.payUrl.includes(`transaction_param=${order.ref}`));
    assert.ok(ck.payUrl.includes('amount=60000'));
    const bad = createPayment(order, 'https://oxy.uz', 'evil');
    assert.equal(bad.provider, 'manual');
    assert.equal(bad.payUrl, null);
  });
});

function clickSign(p, withPrepare) {
  const base = String(p.click_trans_id) + String(p.service_id) + 'sec' + String(p.merchant_trans_id) +
    (withPrepare ? String(p.merchant_prepare_id) : '') + String(p.amount) + String(p.action) + String(p.sign_time);
  return crypto.createHash('md5').update(base, 'utf8').digest('hex');
}

test(`click: to'ldirish prepare -> complete balansni AVTOMATIK to'ldiradi, takroriy complete qo'shmaydi`, async () => {
  await withEnv({ ...NONE_ENV, ...CLICK_ENV }, async () => {
    const s = STEAM();
    const { order } = await createDepositOrder({ steam: s, amount: 60000 });
    const prep = { click_trans_id: 'cd-' + Math.random(), service_id: '7', merchant_trans_id: order.ref, amount: '60000', action: '0', sign_time: '2026-01-01 00:00:00' };
    prep.sign_string = clickSign(prep, false);
    const pr = await handleClickPrepare(prep);
    assert.equal(pr.error, 0);
    const comp = { ...prep, action: '1', merchant_prepare_id: pr.merchant_prepare_id };
    comp.sign_string = clickSign(comp, true);
    assert.equal((await handleClickComplete(comp)).error, 0);
    assert.equal(await getBalance(s.steamid), 60000);
    await handleClickComplete(comp);
    await handleClickComplete(comp);
    assert.equal(await getBalance(s.steamid), 60000);
    assert.equal((await getOrder(order.id)).status, 'done');
  });
});

test(`click: noto'g'ri summa yoki yomon imzo balansni o'zgartirmaydi`, async () => {
  await withEnv({ ...NONE_ENV, ...CLICK_ENV }, async () => {
    const s = STEAM();
    const { order } = await createDepositOrder({ steam: s, amount: 60000 });
    const prep = { click_trans_id: 'cw-' + Math.random(), service_id: '7', merchant_trans_id: order.ref, amount: '60000', action: '0', sign_time: 't' };
    prep.sign_string = clickSign(prep, false);
    const pr = await handleClickPrepare(prep);
    const wrongAmt = { ...prep, action: '1', amount: '1000', merchant_prepare_id: pr.merchant_prepare_id };
    wrongAmt.sign_string = clickSign(wrongAmt, true);
    assert.equal((await handleClickComplete(wrongAmt)).error, -2);
    const badSign = { ...prep, action: '1', merchant_prepare_id: pr.merchant_prepare_id, sign_string: 'deadbeef' };
    assert.equal((await handleClickComplete(badSign)).error, -1);
    assert.equal(await getBalance(s.steamid), 0);
  });
});

test.after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});
