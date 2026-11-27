import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSets, popularWithin } from '../lib/balanceSets.js';

const mk = (id, weaponType, price, count = 10, extra = {}) => ({ id, name: id, weaponType, price, count, wear: 'Factory New', ...extra });
const pool = [
  mk('ak', 'rifle', 500000, 100),
  mk('ak2', 'rifle', 470000, 90),
  mk('m4', 'rifle', 450000, 80),
  mk('awp', 'sniper', 300000, 60),
  mk('awp2', 'sniper', 280000, 55),
  mk('deagle', 'pistol', 200000, 90),
  mk('glock', 'pistol', 90000, 200),
  mk('p250', 'pistol', 80000, 150),
  mk('mac10', 'smg', 85000, 120),
  mk('nova', 'heavy', 88000, 70),
  mk('knife', 'knife', 750000, 5),
  mk('sv', 'rifle', 480000, 999, { souvenir: true }),
  mk('locked', 'rifle', 490000, 999, { availableAfter: '2030-01-01' }),
];

test("popularWithin: byudjetga sig'adi, souvenir va bloklanganlar chiqmaydi, ommabop birinchi", () => {
  const r = popularWithin(pool, 500000, 5);
  assert.ok(r.every((p) => p.price <= 500000));
  assert.ok(!r.some((p) => p.id === 'sv' || p.id === 'locked'));
  assert.equal(r[0].id, 'glock');
});

test("buildSets: har bir to'plam byudjetdan oshmaydi va kamida 2 skin", () => {
  for (const budget of [200000, 500000, 1000000, 1500000]) {
    for (const s of buildSets(pool, budget)) {
      assert.ok(s.total <= budget, `${s.key} ${s.total} > ${budget}`);
      assert.ok(s.items.length >= 2, `${s.key} faqat ${s.items.length} ta`);
    }
  }
});

test("buildSets: bir nechta variant chiqadi va bir xil to'plam takrorlanmaydi", () => {
  const sets = buildSets(pool, 1000000);
  assert.ok(sets.length >= 3);
  const sigs = sets.map((s) => s.items.map((p) => p.id).sort().join('|'));
  assert.equal(new Set(sigs).size, sigs.length);
});

test("buildSets: to'plamda bir xil skin (nom) ikki marta uchramaydi", () => {
  for (const s of buildSets(pool, 1000000)) {
    const names = s.items.map((p) => p.name);
    assert.equal(new Set(names).size, names.length);
  }
});

test("buildSets: qurol to'plami rifle + sniper (+ pistol)", () => {
  const kit = buildSets(pool, 1000000).find((s) => s.key === 'kit');
  assert.ok(kit);
  assert.deepEqual(kit.items.slice(0, 2).map((p) => p.weaponType), ['rifle', 'sniper']);
});

test("buildSets: yaroqsiz byudjet bo'sh qaytaradi", () => {
  assert.deepEqual(buildSets(pool, 0), []);
  assert.deepEqual(buildSets(pool, NaN), []);
  assert.deepEqual(buildSets([], 500000), []);
});
