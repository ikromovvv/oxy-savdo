import test from 'node:test';
import assert from 'node:assert/strict';
import { runWithLisKey } from '../lib/lisContext.js';
import * as lis from '../lib/fulfill/lis.js';

test('LIS kaliti: admin konteksti umumiy kalitdan ustun', async () => {
  const prev = process.env.LIS_SKINS_API_KEY;
  process.env.LIS_SKINS_API_KEY = 'global-key';
  try {
    assert.equal(lis.configured(), true); // kontekstsiz — env kaliti
    await runWithLisKey('', async () => {
      assert.equal(lis.configured(), false); // adminning kaliti yo'q — umumiy kalit ISHLATILMAYDI
    });
    await runWithLisKey('admin-key', async () => {
      assert.equal(lis.configured(), true);
    });
  } finally {
    if (prev === undefined) delete process.env.LIS_SKINS_API_KEY;
    else process.env.LIS_SKINS_API_KEY = prev;
  }
});

test('LIS kaliti: parallel so\'rovlar bir-biriga aralashmaydi', async () => {
  const seen = [];
  await Promise.all(
    ['k1', 'k2', 'k3'].map((k) =>
      runWithLisKey(k, async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 20));
        seen.push([k, lis.configured()]);
      })
    )
  );
  assert.equal(seen.length, 3);
  assert.ok(seen.every(([, ok]) => ok === true));
});
