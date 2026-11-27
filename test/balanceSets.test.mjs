import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSets, popularWithin } from '../lib/balanceSets.js';

const mk = (id, weaponType, price, count = 10, extra = {}) => ({ id, weaponType, price, count, wear: 'Factory New', ...extra });
const pool = [
  mk('ak', 'rifle', 500000, 100),
  mk('m4', 'rifle', 450000, 80),
  mk('awp', 'sniper', 300000, 60),
  mk('deagle', 'pistol', 200000, 90),
  mk('glock', 'pistol', 90000, 200),
  mk('p250', 'pistol', 80000, 150),
  mk('mac10', 'smg', 85000, 120),
  mk('nova', 'heavy', 88000, 70),
  mk('knife', 'knife', 950000, 5),
  mk('sv', 'rifle', 480000, 999, { souvenir: true }),
  mk('locked', 'rifle', 490000, 999, { availableAfter: '2030-01-01' }),
];

test('popularWithin: byudjetga sig\'adi, souvenir va bloklanganlar chiqmaydi, ommabop birinchi', () => {
  const r = popularWithin(pool, 500000, 5);
  assert.ok(r.every((p) => p.price <= 500000));
  assert.ok(!r.some((p) => p.id === 'sv' || p.id === 'locked'));
  assert.equal(r[0].id, 'glock');
});

test('buildSets: har bir to\'plam byudjetdan oshmaydi', () => {
  for (const budget of [200000, 500000, 1000000, 1500000]) {
    for (const s of buildSets(pool, budget)) {
      assert.ok(s.total <= budget, `${s.key} ${s.total} > ${budget}`);
      assert.ok(s.items.length >= 1);
    }
  }
});

test('buildSets: bitta kuchli skin byudjetning 70% idan yuqori', () => {
  const single = buildSets(pool, 1000000).find((s) => s.key === 'single');
  assert.equal(single.items[0].id, 'knife');
});

test('buildSets: qurol to\'plami rifle + sniper + pistol', () => {
  const kit = buildSets(pool, 1000000).find((s) => s.key === 'kit');
  assert.deepEqual(kit.items.map((p) => p.weaponType), ['rifle', 'sniper', 'pistol']);
});

test('buildSets: yaroqsiz byudjet bo\'sh qaytaradi', () => {
  assert.deepEqual(buildSets(pool, 0), []);
  assert.deepEqual(buildSets(pool, NaN), []);
  assert.deepEqual(buildSets([], 500000), []);
});
