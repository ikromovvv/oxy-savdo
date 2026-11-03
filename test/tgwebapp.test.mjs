// Telegram Mini App initData tekshiruvi — node:test, tarmoqsiz.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { verifyInitData } = await import(pathToFileURL(path.join(process.cwd(), 'lib', 'tgWebApp.js')).href);

const TOKEN = '123456:TEST-TOKEN';

function sign(fields, token = TOKEN) {
  const dataCheck = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const fresh = () => ({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 42, username: 'abc' }) });

test('imzosi to\'g\'ri initData foydalanuvchini qaytaradi', () => {
  assert.equal(verifyInitData(sign(fresh()), TOKEN)?.id, 42);
});

test('boshqa token bilan imzolangan initData rad etiladi', () => {
  assert.equal(verifyInitData(sign(fresh(), 'other:token'), TOKEN), null);
});

test('o\'zgartirilgan yoki eskirgan initData rad etiladi', () => {
  const tampered = sign(fresh()).replace('%22id%22%3A42', '%22id%22%3A43');
  assert.equal(verifyInitData(tampered, TOKEN), null);
  const old = { ...fresh(), auth_date: String(Math.floor(Date.now() / 1000) - 3 * 24 * 3600) };
  assert.equal(verifyInitData(sign(old), TOKEN), null);
  assert.equal(verifyInitData('', TOKEN), null);
});
