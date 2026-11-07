// cs2shop Telegram xabarlari + bot /id buyrug'i — node:test, soxta fetch bilan.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.TELEGRAM_BOT_TOKEN = '123:TEST';
process.env.CS2SHOP_MERCHANT_ID = 'Oxy';
process.env.CS2SHOP_API_KEY = 'cs2_testkey';
delete process.env.KV_REST_API_URL;
delete process.env.TELEGRAM_CHAT_ID;
delete process.env.TELEGRAM_CS2SHOP_CHAT_ID;

const imp = (rel) => import(pathToFileURL(path.join(process.cwd(), rel)).href);
const { handleBotMessage } = await imp('lib/tgBot.js');
const alerts = await imp('lib/cs2shopAlerts.js');

function mockFetch({ balance = 100 } = {}) {
  const sent = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('api.telegram.org')) {
      sent.push(JSON.parse(init.body));
      return new Response('{"ok":true}', { status: 200 });
    }
    if (u.includes('/v1/merchant/wallet')) {
      return new Response(JSON.stringify({ balance, total_available: balance, total_frozen: 0 }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 404 });
  };
  return sent;
}

test('/id guruhda: chat ID bilan javob beradi', async () => {
  const sent = mockFetch();
  const r = await handleBotMessage({ message: { message_id: 7, text: '/id@oxygensavdobot', chat: { id: -1001234567890, type: 'supergroup' } } });
  assert.equal(r.ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chat_id, -1001234567890);
  assert.match(sent[0].text, /-1001234567890/);
});

test('/id shaxsiy chatda ham ishlaydi', async () => {
  const sent = mockFetch();
  await handleBotMessage({ message: { text: '/id', chat: { id: 42, type: 'private' } } });
  assert.match(sent[0].text, /42/);
});

test('guruhdagi oddiy xabarga javob bermaydi', async () => {
  const sent = mockFetch();
  const r = await handleBotMessage({ message: { text: 'salom', chat: { id: -100, type: 'group' } } });
  assert.equal(r.skip, 'not_private_message');
  assert.equal(sent.length, 0);
});

test('/start shaxsiy chatda avvalgidek Mini App tugmasi', async () => {
  const sent = mockFetch();
  await handleBotMessage({ message: { text: '/start', chat: { id: 5, type: 'private' } } });
  assert.ok(sent[0].reply_markup.inline_keyboard);
});

test('notifyCs2shop: TELEGRAM_CS2SHOP_CHAT_ID guruhiga yuboradi, bo\'lmasa umumiy chatga', async () => {
  let sent = mockFetch();
  process.env.TELEGRAM_CHAT_ID = '111';
  await alerts.notifyCs2shop('a');
  assert.equal(sent[0].chat_id, '111'); // zaxira: umumiy chat

  sent = mockFetch();
  process.env.TELEGRAM_CS2SHOP_CHAT_ID = '-100999';
  await alerts.notifyCs2shop('b');
  assert.equal(sent[0].chat_id, '-100999');
});

test('checkLowBalance: balans kam bo\'lsa guruhga ogohlantiradi', async () => {
  process.env.TELEGRAM_CS2SHOP_CHAT_ID = '-100999';
  process.env.CS2SHOP_LOW_BALANCE_USD = '20';
  const sent = mockFetch({ balance: 3.5 });
  const r = await alerts.checkLowBalance();
  assert.equal(r.low, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chat_id, '-100999');
  assert.match(sent[0].text, /\$3\.50/);
});

test('checkLowBalance: balans yetarli bo\'lsa xabar yo\'q', async () => {
  process.env.CS2SHOP_LOW_BALANCE_USD = '20';
  const sent = mockFetch({ balance: 50 });
  const r = await alerts.checkLowBalance();
  assert.equal(r.low, false);
  assert.equal(sent.length, 0);
});
