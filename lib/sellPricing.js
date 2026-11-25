// Skin SOTISH (biz sotuvchidan sotib olamiz) narxlari.
// Asos narx = bozor narxi (Skinport / LIS qulfsiz eng arzoni — kichigi). Sotuvchiga to'lanadigan narx = asos × foiz.
// Foiz to'lov usuliga bog'liq: sayt balansiga eng yuqori (pul tizimimizda qoladi), kartaga eng past (komissiya).
// Maqsad: LIS to'laydigan narxdan (≈ bozorning 80–82%) bir oz yuqori bo'lish — sotuvchilar bizni tanlasin.
//   Env:  SELL_PAYOUT_BALANCE_PCT=85   SELL_PAYOUT_CRYPTO_PCT=83   SELL_PAYOUT_CARDS_PCT=82

export const PAYOUT_DEFAULTS = { balance: 85, crypto: 83, cards: 82 };
const ENV = { balance: 'SELL_PAYOUT_BALANCE_PCT', crypto: 'SELL_PAYOUT_CRYPTO_PCT', cards: 'SELL_PAYOUT_CARDS_PCT' };

export function payoutPercents(env = process.env) {
  const out = {};
  for (const k of Object.keys(PAYOUT_DEFAULTS)) {
    const v = Number(env[ENV[k]]);
    out[k] = Number.isFinite(v) && v >= 50 && v <= 100 ? v : PAYOUT_DEFAULTS[k];
  }
  return out;
}

// Asos (bozor) narxdan sotuvchiga to'lanadigan narx (USD, sentgacha)
export function payoutPrice(marketUsd, method, pcts = payoutPercents()) {
  const m = Number(marketUsd);
  if (!(m > 0)) return 0;
  const pct = pcts[method] ?? pcts.balance;
  return Math.round(m * pct) / 100;
}
