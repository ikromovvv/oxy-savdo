import test from 'node:test';
import assert from 'node:assert/strict';
import { colorsOf, queryLisList } from '../lib/lisAdminCatalog.js';

test('colorsOf: asosiy nom va Doppler fazasi', () => {
  assert.ok(colorsOf('AK-47 | Redline').includes('red'));
  assert.deepEqual(colorsOf('Nomalum | Skin'), []);
});

test('queryLisList: rang filtri', () => {
  const list = [
    { name: 'AK-47 | Redline (Field-Tested)', price: 20, unlocked_price: 20, count: 5 },
    { name: 'AWP | Hyper Beast (Field-Tested)', price: 30, unlocked_price: 30, count: 3 },
  ];
  const r = queryLisList(list, { color: 'red' });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].baseName, 'AK-47 | Redline');
  const both = queryLisList(list, { color: 'red,blue' });
  assert.equal(both.items.length, 2);
  assert.equal(queryLisList(list, {}).items.length, 2);
});
