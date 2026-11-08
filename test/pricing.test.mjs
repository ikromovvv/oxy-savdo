// Narx qoidalari (lib/pricing.js) — node:test, tarmoqsiz.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.PRICING_MODE = 'markup'; // bu fayl foyda/ustama qoidalarini tekshiradi
const P = await import(pathToFileURL(path.join(process.cwd(), 'lib', 'pricing.js')).href);
const { baseProfit, premiumFor, sellPrice, MIN_PROFIT_USD, FEE_BUFFER } = P;
const r2 = (n) => Math.round(n * 100) / 100;

test('arzon skin: foyda qat\'iy $1', () => {
  assert.equal(baseProfit(0.5), 1);
  assert.equal(baseProfit(3), 1);
  assert.equal(baseProfit(8), 1);
});

test('$8–30: 12%, lekin $1 dan kam emas', () => {
  assert.equal(baseProfit(9), 1.08);
  assert.equal(baseProfit(20), 2.4);
  assert.equal(baseProfit(30), 3.6);
});

test('foyda pog\'onalarda monoton: sotuv narxi tannarx bilan birga o\'sadi', () => {
  let prev = 0;
  for (let c = 0.5; c <= 2000; c += 0.5) {
    const sell = sellPrice({ costUsd: c, marketHashName: 'X | Y (Field-Tested)' }).sellUsd;
    assert.ok(sell >= prev, `${c}$ da narx kamaydi: ${sell} < ${prev}`);
    prev = sell;
  }
});

test('katta narxlarda foiz pasayadi: 8% / 6% / 4%', () => {
  assert.equal(baseProfit(100), 8);
  assert.equal(baseProfit(300), 18);
  assert.equal(baseProfit(1000), 40);
});

test('har qanday skinda foyda >= minimal ($1)', () => {
  for (const c of [0.03, 1, 5, 50, 500, 5000]) {
    const r = sellPrice({ costUsd: c, marketHashName: 'X | Y (Field-Tested)' });
    assert.ok(r.profitUsd >= MIN_PROFIT_USD, `${c}$: foyda ${r.profitUsd}`);
  }
});

test('sellPrice: oddiy skin = (cost + foyda) * (1 + komissiya)', () => {
  const r = sellPrice({ costUsd: 2, marketHashName: 'AK-47 | Redline (Field-Tested)' });
  assert.equal(r.sellUsd, r2((2 + 1) * (1 + FEE_BUFFER)));
  assert.equal(r.premiumPct, 0);
});

test('ustama: StatTrak +5%, Doppler Ruby +25%', () => {
  assert.equal(premiumFor({ marketHashName: 'StatTrak™ AK-47 | Redline (Field-Tested)' }).pct, 0.05);
  assert.equal(premiumFor({ marketHashName: '★ Karambit | Doppler (Factory New)', phase: 'Ruby' }).pct, 0.25);
  assert.equal(premiumFor({ marketHashName: '★ Karambit | Doppler (Factory New)', phase: 'Phase 1' }).pct, 0);
});

test('ustama: past float (FN 0.00–0.01 yuqori, o\'rtacha float ustamasiz)', () => {
  const name = 'AK-47 | Redline (Factory New)';
  assert.equal(premiumFor({ marketHashName: name, floatValue: 0.005 }).pct, 0.12);
  assert.equal(premiumFor({ marketHashName: name, floatValue: 0.06 }).pct, 0);
  assert.equal(premiumFor({ marketHashName: 'AK-47 | Redline (Minimal Wear)', floatValue: 0.075 }).pct, 0.08);
  assert.equal(premiumFor({ marketHashName: 'AK-47 | Redline (Minimal Wear)', floatValue: 0.12 }).pct, 0);
  // Battle-Scarred / Well-Worn uchun float ustamasi yo'q
  assert.equal(premiumFor({ marketHashName: 'AK-47 | Redline (Battle-Scarred)', floatValue: 0.46 }).pct, 0);
});

test('ustama: mashhur naqsh (AK Case Hardened blue gem) va jami cheklov', () => {
  const name = 'AK-47 | Case Hardened (Field-Tested)';
  assert.equal(premiumFor({ marketHashName: name, paintSeed: 661 }).pct, 0.25);
  assert.equal(premiumFor({ marketHashName: name, paintSeed: 1 }).pct, 0);
  // StatTrak + Ruby + past float > 40% bo'lmaydi
  const big = premiumFor({
    marketHashName: 'StatTrak™ ★ Karambit | Doppler (Factory New)',
    phase: 'Ruby',
    floatValue: 0.001,
  });
  assert.equal(big.pct, 0.4);
});

test('ustama sotuv narxiga qo\'shiladi', () => {
  const plain = sellPrice({ costUsd: 100, marketHashName: 'AK-47 | Redline (Factory New)' });
  const low = sellPrice({ costUsd: 100, marketHashName: 'AK-47 | Redline (Factory New)', floatValue: 0.003 });
  assert.ok(low.sellUsd > plain.sellUsd);
  assert.ok(low.reasons.some((r) => r.startsWith('float:')));
});

test('override: addUsd foydaga qo\'shiladi, minus ham ruxsat, lekin foyda >= minimal', () => {
  const name = 'AK-47 | Redline (Field-Tested)';
  const base = sellPrice({ costUsd: 2, marketHashName: name });
  const plus = sellPrice({ costUsd: 2, marketHashName: name }, { [name]: { addUsd: 3 } });
  assert.ok(plus.sellUsd > base.sellUsd);
  assert.equal(plus.sellUsd, r2((2 + 1 + 3) * (1 + FEE_BUFFER)));

  const minus = sellPrice({ costUsd: 2, marketHashName: name }, { [name]: { addUsd: -5 } });
  assert.equal(minus.sellUsd, base.sellUsd); // taglik: foyda minimaldan pasaymaydi
});

test('override: fixedUsd qat\'iy narx, listingId nomdan ustun', () => {
  const name = 'AK-47 | Redline (Field-Tested)';
  const r = sellPrice(
    { costUsd: 10, marketHashName: name, listingId: 'L1' },
    { [name]: { fixedUsd: 25 }, L1: { fixedUsd: 30 } }
  );
  assert.equal(r.sellUsd, 30);
  assert.equal(r.override, true);
});

test('noto\'g\'ri kirish: NaN/manfiy tannarx xavfsiz', () => {
  const r = sellPrice({ costUsd: 'abc', marketHashName: 'X' });
  assert.ok(Number.isFinite(r.sellUsd));
  assert.ok(r.sellUsd >= MIN_PROFIT_USD);
});

test('$5 skin ~$6.2, ustamalar bilan ham $6.5 dan oshmaydi', () => {
  const plain = sellPrice({ costUsd: 5, marketHashName: 'AK-47 | Redline (Field-Tested)' });
  assert.ok(plain.sellUsd >= 6 && plain.sellUsd <= 6.5, String(plain.sellUsd));
  // past float (+12%) + StatTrak (+5%) ham chegaradan oshirmaydi
  const fancy = sellPrice({ costUsd: 5, marketHashName: 'StatTrak™ AK-47 | Redline (Factory New)', floatValue: 0.002 });
  assert.ok(fancy.sellUsd <= 6.5, String(fancy.sellUsd));
  assert.ok(fancy.sellUsd >= plain.sellUsd);
});

test('arzon skin cheklovi qo\'lda override\'ga tegmaydi', () => {
  const name = 'X | Y (Field-Tested)';
  const r = sellPrice({ costUsd: 5, marketHashName: name }, { [name]: { addUsd: 3 } });
  assert.equal(r.sellUsd, r2((5 + 1 + 3) * (1 + FEE_BUFFER)));
});

// ---- cost rejimi (birlamchi): sotuv narxi = cs2shop narxi ----

test('cost rejimi: sotuv narxi tannarx bilan bir xil, ustama va foyda yo\'q', () => {
  process.env.PRICING_MODE = 'cost';
  try {
    for (const c of [0.5, 5, 13392.94]) {
      const r = sellPrice({ costUsd: c, marketHashName: 'StatTrak™ AK-47 | Redline (Factory New)', floatValue: 0.001, phase: 'Ruby' });
      assert.equal(r.sellUsd, c);
      assert.equal(r.profitUsd, 0);
      assert.equal(r.premiumPct, 0);
    }
  } finally {
    process.env.PRICING_MODE = 'markup';
  }
});

test('cost rejimi: qo\'lda override ishlaydi (addUsd / fixedUsd)', () => {
  process.env.PRICING_MODE = 'cost';
  try {
    const name = 'X | Y (Field-Tested)';
    assert.equal(sellPrice({ costUsd: 5, marketHashName: name }, { [name]: { addUsd: 1 } }).sellUsd, 6);
    assert.equal(sellPrice({ costUsd: 5, marketHashName: name }, { [name]: { fixedUsd: 7.5 } }).sellUsd, 7.5);
  } finally {
    process.env.PRICING_MODE = 'markup';
  }
});

test('PRICING_MODE o\'rnatilmasa — birlamchi cost', () => {
  delete process.env.PRICING_MODE;
  try {
    assert.equal(P.pricingMode(), 'cost');
    assert.equal(sellPrice({ costUsd: 5, marketHashName: 'X | Y (Field-Tested)' }).sellUsd, 5);
  } finally {
    process.env.PRICING_MODE = 'markup';
  }
});
