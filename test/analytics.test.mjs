// Statistika va stats-rol testlari — node:test, tarmoqsiz, lokal fayl rejimi.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-analytics-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
process.chdir(TMP);

process.env.SESSION_SECRET = 'test-secret';
process.env.FULFILL_PROVIDER = 'manual';
process.env.ADMIN_PASSWORD = 'main-pass';
process.env.ADMIN_NAME = 'Boss';
process.env.ADMIN_STATS_1_NAME = 'viewer';
process.env.ADMIN_STATS_1_PASSWORD = 'stats-pass';
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

const PROJECT = path.resolve(import.meta.dirname, '..');
const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);

const A = await imp('lib/analyticsStore.js');
const auth = await imp('lib/adminAuth.js');
const { getSalesStats, isPaidOrder } = await imp('lib/adminStats.js');

const NOW = Date.parse('2026-11-27T10:00:00+05:00');

test('adminAuth: stats akkaunt alohida rol bilan, parol bo\'yicha topiladi', () => {
  const stats = auth.findAdminByPassword('stats-pass');
  assert.equal(stats.role, 'stats');
  assert.equal(stats.name, 'viewer');
  assert.equal(auth.findAdminByPassword('main-pass').role, 'admin');
  assert.equal(auth.findAdminByPassword('wrong'), null);
});

test('adminAuth: stats akkauntda LIS kaliti yo\'q', () => {
  assert.equal(auth.findAdminByPassword('stats-pass').lisKey, '');
});

test('recordVisit: noto\'g\'ri vid rad etiladi', async () => {
  assert.equal(await A.recordVisit({ vid: 'x', now: NOW }), false);
  assert.equal(await A.recordVisit({ vid: 'bad id!', now: NOW }), false);
});

test('traffic: noyob tashrifchi, tashrif soni va onlayn', async () => {
  await A.recordVisit({ vid: 'visitor-aaaa1111', now: NOW - 3600_000 });
  await A.recordVisit({ vid: 'visitor-aaaa1111', now: NOW - 60_000 });
  await A.recordVisit({ vid: 'visitor-bbbb2222', steamid: '7656119800000001', now: NOW - 30_000 });
  // heartbeat tashrif sifatida sanalmaydi, lekin onlaynni yangilaydi
  await A.recordVisit({ vid: 'visitor-cccc3333', hb: true, now: NOW - 10_000 });

  const t = await A.getTrafficStats({ now: NOW });
  assert.equal(t.totalVisitors, 3);
  assert.equal(t.today.visitors, 3);
  assert.equal(t.today.hits, 3); // 2 + 1 + 0
  assert.equal(t.activeNow, 3); // hammasi oxirgi 5 daqiqada ko'ringan (aaaa — 60s oldin)
  assert.equal(t.unique7d, 3);
  assert.equal(t.series.length, 30);
});

test('traffic: kechagi tashrif bugunga qo\'shilmaydi', async () => {
  await A.recordVisit({ vid: 'visitor-dddd4444', now: NOW - 26 * 3600_000 });
  const t = await A.getTrafficStats({ now: NOW });
  assert.equal(t.today.visitors, 3);
  assert.equal(t.unique7d, 4);
  assert.equal(t.activeNow, 3);
});

test('users: Steam bilan kirganlar va demo bo\'lmagan to\'ldirishlar', async () => {
  fs.writeFileSync(
    path.join(TMP, 'data', 'wallets.json'),
    JSON.stringify({
      wallets: { '7656119800000001': { balance: 50000 }, 'demo:7656119800000001': { balance: 999999 } },
      txns: [
        { id: 1, steamid: '7656119800000001', kind: 'deposit', amount: 50000, at: NOW - 1000, key: 'a' },
        { id: 2, steamid: 'demo:7656119800000001', kind: 'deposit', amount: 999999, at: NOW - 1000, key: 'b' },
        { id: 3, steamid: '7656119800000001', kind: 'purchase', amount: -10000, at: NOW - 500, key: 'c' },
      ],
    })
  );
  const u = await A.getUserStats({ now: NOW });
  assert.equal(u.loggedIn.total, 1);
  assert.equal(u.loggedIn.activeNow, 1);
  assert.equal(u.wallets.count, 1);
  assert.equal(u.wallets.total, 50000);
  assert.equal(u.deposits.all.count, 1);
  assert.equal(u.deposits.all.sum, 50000);
  assert.equal(u.deposits.today.users, 1);
});

test('isPaidOrder: balans to\'ldirish va demo tushum hisobiga kirmaydi', () => {
  const base = { status: 'done', payment: { status: 'paid', provider: 'payme' }, items: [{ kind: 'skin', qty: 1 }], total: 100000 };
  assert.equal(isPaidOrder(base), true);
  assert.equal(isPaidOrder({ ...base, items: [{ kind: 'deposit' }] }), false);
  assert.equal(isPaidOrder({ ...base, payment: { status: 'paid', provider: 'wallet-demo' } }), false);
  assert.equal(isPaidOrder({ ...base, status: 'refunded' }), false);
});

test('isBot: botlar aniqlanadi', () => {
  assert.equal(A.isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(A.isBot('Mozilla/5.0 (Windows NT 10.0) Chrome/120'), false);
});

test('sales: bo\'sh bazada xatosiz nol qaytaradi', async () => {
  const s = await getSalesStats({ now: NOW });
  assert.equal(s.all.orders, 0);
  assert.equal(s.series.length, 30);
});
