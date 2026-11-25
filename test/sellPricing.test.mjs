import test from 'node:test';
import assert from 'node:assert/strict';
import { payoutPercents, payoutPrice, PAYOUT_DEFAULTS } from '../lib/sellPricing.js';

test('payoutPercents: standart va env', () => {
  assert.deepEqual(payoutPercents({}), PAYOUT_DEFAULTS);
  assert.equal(payoutPercents({ SELL_PAYOUT_BALANCE_PCT: '90' }).balance, 90);
  assert.equal(payoutPercents({ SELL_PAYOUT_BALANCE_PCT: '20' }).balance, PAYOUT_DEFAULTS.balance); // juda past — e'tiborsiz
  assert.equal(payoutPercents({ SELL_PAYOUT_CARDS_PCT: 'abc' }).cards, PAYOUT_DEFAULTS.cards);
});

test('payoutPrice: bozor narxi x foiz', () => {
  const p = payoutPercents({});
  assert.equal(payoutPrice(51.06, 'balance', p), 43.4); // 85%
  assert.equal(payoutPrice(100, 'cards', p), 82);
  assert.equal(payoutPrice(100, 'nomalum', p), 85); // noma'lum usul — balans
  assert.equal(payoutPrice(0, 'balance', p), 0);
  // LIS to'lovi (~81.6%) dan balans/kripto/karta foizlari yuqori
  assert.ok(Object.values(p).every((v) => v > 81.7));
});
