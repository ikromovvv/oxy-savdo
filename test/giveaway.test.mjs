// Rozigrysh: ishtirokchi shartlari, Steam bog'lash, imzolangan havola tokeni — node:test, tarmoqsiz.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-gw-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
process.chdir(TMP);
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.POSTGRES_PRISMA_URL;
delete process.env.KV_REST_API_URL;

const PROJECT = path.resolve(import.meta.dirname, '..');
const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);

const store = await imp('lib/giveawayStore.js');
const bot = await imp('lib/giveawayBot.js');

test(`ishtirokchi faqat IKKALA shart bajarilganda qatnashadi`, async () => {
  // 1) faqat obuna
  let e = await store.upsertEntry({ tgId: 1001, username: 'ali', name: 'Ali', subscribed: true });
  assert.equal(store.isEligible(e), false);
  // 2) Steam ulandi -> endi qatnashadi
  const r = await store.linkSteam({ tgId: 1001, username: 'ali', steamid: '76561198000000001', steamName: 'AliSteam' });
  assert.equal(store.isEligible(r.entry), true);
  // 3) obunani bekor qildi -> chiqib ketadi
  await store.setSubscribed(1001, false);
  assert.equal(store.isEligible(await store.getEntry(1001)), false);
});

test(`Steam ulangan, lekin obuna yo'q bo'lsa qatnashmaydi`, async () => {
  const r = await store.linkSteam({ tgId: 1002, steamid: '76561198000000002', steamName: 'Vali' });
  assert.equal(store.isEligible(r.entry), false);
});

test(`bitta Steam akkaunt ikkinchi Telegram akkauntga ulanmaydi`, async () => {
  await store.linkSteam({ tgId: 2001, steamid: '76561198000000009', steamName: 'Bir' });
  const dup = await store.linkSteam({ tgId: 2002, steamid: '76561198000000009', steamName: 'Bir' });
  assert.equal(dup.error, 'steam_taken');
  // o'sha Telegram akkaunt qayta ulansa — xato emas
  const again = await store.linkSteam({ tgId: 2001, steamid: '76561198000000009', steamName: 'Bir' });
  assert.ok(again.entry);
});

test(`havola tokeni: imzo, muddat va turi tekshiriladi`, async () => {
  const t = bot.makeLinkToken(555, 'sardor');
  assert.deepEqual(bot.readLinkToken(t), { tgId: 555, username: 'sardor' });
  assert.equal(bot.readLinkToken(t + 'x'), null); // imzo buzilgan
  assert.equal(bot.readLinkToken('abc.def'), null);
  // oddiy sessiya cookie'si havola tokeni sifatida o'tmasligi kerak
  const { createSessionToken } = await imp('lib/session.js');
  assert.equal(bot.readLinkToken(createSessionToken({ steamid: '1', exp: Date.now() + 1000 })), null);
  // muddati o'tgan
  assert.equal(bot.readLinkToken(createSessionToken({ typ: 'gw', tg: 1, exp: Date.now() - 1 })), null);
});

test(`holat matni: shartlar belgilanadi`, () => {
  const none = bot.statusText({ subscribed: false, steamid: null });
  assert.ok(none.includes('\u274C') && !none.includes('ishtirok etyapsiz'));
  const full = bot.statusText({ subscribed: true, steamid: '1', joined: true });
  assert.ok(full.includes('ishtirok etyapsiz'));
});

test(`yangi rozigrish: reset qatnashishni nolga tushiradi, Steam bog'lanishi saqlanadi`, async () => {
  await store.upsertEntry({ tgId: 3001, username: 'x', name: 'X', subscribed: true });
  await store.linkSteam({ tgId: 3001, steamid: '76561198000003001', steamName: 'X' });
  assert.equal(store.isEligible(await store.getEntry(3001)), true);
  await store.recordWinner({ tgId: 3001, steamid: '76561198000003001' });

  const n = await store.resetEntries();
  assert.ok(n >= 1);
  const e = await store.getEntry(3001);
  assert.equal(e.steamid, '76561198000003001'); // Steam saqlandi
  assert.equal(store.isEligible(e), false); // qatnashish nolga tushdi
  assert.equal((await store.listWinners()).length, 0);

  // foydalanuvchi qayta bot/Mini App bilan aloqa qilsa, o'zi qatnashadi (Steam'ni qayta ulamasdan)
  const again = await store.upsertEntry({ tgId: 3001, username: 'x', name: 'X', subscribed: true });
  assert.equal(store.isEligible(again), true);
});
