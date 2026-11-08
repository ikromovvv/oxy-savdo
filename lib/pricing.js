// Skin sotuv narxi: provayder (cs2shop) tannarxi + foyda + ko'rinish ustamasi.
//
//   sell = (cost + foyda + cost * ustama) * (1 + komissiya zaxirasi)
//
// 1-qatlam. Asosiy foyda (tannarxga qarab, har doim >= MIN_PROFIT_USD):
//     $0–8      — qat'iy $1
//     $8–30     — 12%
//     $30–150   — 8%
//     $150–600  — 6%
//     $600+     — 4%
//   Foiz pasayganda sotuv narxi kamaymasligi uchun har pog'onaning foydasi
//   oldingi pog'ona chegarasidagi foydadan past tushmaydi (narx monoton o'sadi).
//   Arzon skinlar ($8 gacha): ustamalar bilan ham sotuv narxi tannarx + $1.5 dan oshmaydi
//   (masalan $5 skin ~$6.2, eng ko'pi $6.5).
// 2-qatlam. Ustama (cost'ga foiz): past float, Doppler gemlari, mashhur naqshlar,
//   StatTrak / Souvenir. Jami ustama MAX_PREMIUM bilan cheklanadi.
// 3-qatlam. Qo'lda belgilash (overrides): market_hash_name yoki listingId bo'yicha
//   { addUsd } (foydaga qo'shimcha) yoki { fixedUsd } (qat'iy sotuv narxi).
//
// Sof funksiya — tarmoq/IO yo'q, testlash oson. Raqamlarni shu yerda o'zgartiring.

// Narx rejimi (env PRICING_MODE):
//   cost   (BIRLAMCHI) — sotuv narxi = cs2shop narxi (ustama yo'q); faqat qo'lda override ishlaydi
//   markup — quyidagi pog'onali foyda + ko'rinish ustamalari + komissiya zaxirasi
export const pricingMode = () => ((process.env.PRICING_MODE || 'cost').toLowerCase() === 'markup' ? 'markup' : 'cost');

export const MIN_PROFIT_USD = 1;

// Arzon skinlar: sotuv narxi tannarxdan shuncha (USD) dan ortiq bo'lmaydi (qo'lda override'dan tashqari)
export const CHEAP_LIMIT_USD = 8;
export const CHEAP_MAX_MARKUP_USD = 1.5;

// [tannarx yuqori chegarasi (USD), foiz]. Birinchi pog'ona foiz o'rniga qat'iy minimal foyda.
export const PROFIT_TIERS = [
  { upTo: 8, pct: 0 },
  { upTo: 30, pct: 0.12 },
  { upTo: 150, pct: 0.08 },
  { upTo: 600, pct: 0.06 },
  { upTo: Infinity, pct: 0.04 },
];

// To'lov komissiyasi (Payme/Click ~1.5%) + REVERSED xavfi zaxirasi (~2%)
export const FEE_BUFFER = 0.035;

// Jami ustama chegarasi (cost ulushi sifatida)
export const MAX_PREMIUM = 0.4;

const PREMIUM = {
  stattrak: 0.05,
  souvenir: 0.05,
  // Doppler gemlari
  phases: { Ruby: 0.25, Sapphire: 0.25, 'Black Pearl': 0.25, Emerald: 0.25 },
  // Past float: wear bo'yicha [float chegarasi (shundan past), ustama]. Faqat FN / MW / FT.
  floatBands: {
    'Factory New': [[0.01, 0.12], [0.02, 0.06], [0.03, 0.02]],
    'Minimal Wear': [[0.08, 0.08], [0.09, 0.03]],
    'Field-Tested': [[0.16, 0.03]],
  },
};

// float -> wear (faqat float ustamasi shu wear'lar uchun hisoblanadi)
const WEAR_RANGES = [
  { name: 'Factory New', min: 0, max: 0.07 },
  { name: 'Minimal Wear', min: 0.07, max: 0.15 },
  { name: 'Field-Tested', min: 0.15, max: 0.38 },
];

// Mashhur naqshlar (paint_seed). TAXMINIY ro'yxat — bozor bilan solishtirib to'ldiring.
// Kalit: market_hash_name'dagi "Quroll | Skin" qismi (wear'siz, StatTrak'siz).
export const PATTERN_PREMIUM = [
  { match: 'AK-47 | Case Hardened', seeds: [661, 670, 955, 179, 387], pct: 0.25 },
];

const round2 = (n) => Math.round(n * 100) / 100;

// Tannarxga qarab foyda (USD)
export function baseProfit(costUsd) {
  const cost = Math.max(0, Number(costUsd) || 0);
  let floor = MIN_PROFIT_USD;
  for (const tier of PROFIT_TIERS) {
    if (cost <= tier.upTo) {
      return round2(Math.max(floor, cost * tier.pct, MIN_PROFIT_USD));
    }
    // keyingi pog'ona uchun taglik = shu pog'ona chegarasidagi foyda
    floor = Math.max(floor, tier.upTo * tier.pct);
  }
  return round2(Math.max(floor, MIN_PROFIT_USD));
}

function stripName(marketHashName) {
  return String(marketHashName || '')
    .replace(/^★\s*/, '')
    .replace(/^StatTrak™\s*/, '')
    .replace(/^Souvenir\s*/, '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();
}

// Ko'rinish ustamasi (cost ulushi): { pct, reasons[] }
export function premiumFor({ marketHashName, floatValue, phase, paintSeed } = {}) {
  const reasons = [];
  let pct = 0;
  const name = String(marketHashName || '');

  if (/^(★\s*)?StatTrak™/.test(name)) {
    pct += PREMIUM.stattrak;
    reasons.push('stattrak');
  }
  if (/^(★\s*)?Souvenir\s/.test(name)) {
    pct += PREMIUM.souvenir;
    reasons.push('souvenir');
  }

  if (phase && PREMIUM.phases[phase]) {
    pct += PREMIUM.phases[phase];
    reasons.push(`phase:${phase}`);
  }

  const f = Number(floatValue);
  if (floatValue != null && Number.isFinite(f) && f >= 0) {
    const range = WEAR_RANGES.find((w) => f >= w.min && f < w.max);
    const band = range && PREMIUM.floatBands[range.name].find(([limit]) => f < limit);
    if (band) {
      pct += band[1];
      reasons.push(`float:${f.toFixed(4)}`);
    }
  }

  if (paintSeed != null && Number.isInteger(Number(paintSeed))) {
    const base = stripName(name);
    const rule = PATTERN_PREMIUM.find((r) => r.match === base && r.seeds.includes(Number(paintSeed)));
    if (rule) {
      pct += rule.pct;
      reasons.push(`seed:${paintSeed}`);
    }
  }

  return { pct: Math.min(pct, MAX_PREMIUM), reasons };
}

// Asosiy funksiya.
//   listing  — { costUsd, marketHashName, floatValue?, phase?, paintSeed?, listingId? }
//   overrides — { [market_hash_name | listingId]: { addUsd?, fixedUsd? } }
// Qaytaradi: { sellUsd, costUsd, profitUsd, premiumPct, reasons, override }
export function sellPrice(listing, overrides = {}) {
  const costUsd = Math.max(0, Number(listing?.costUsd) || 0);
  const ov = overrides[listing?.listingId] || overrides[listing?.marketHashName] || null;

  if (ov && Number(ov.fixedUsd) > 0) {
    const sellUsd = round2(Number(ov.fixedUsd));
    return {
      sellUsd,
      costUsd,
      profitUsd: round2(sellUsd - costUsd),
      premiumPct: 0,
      reasons: ['override:fixed'],
      override: true,
    };
  }

  // cost rejimi: cs2shop narxi aynan o'zi (qo'lda addUsd bo'lsa, shuncha qo'shiladi)
  if (pricingMode() === 'cost') {
    const add0 = ov && Number(ov.addUsd) ? Number(ov.addUsd) : 0;
    const sellUsd = round2(Math.max(0, costUsd + add0));
    return {
      sellUsd,
      costUsd,
      profitUsd: round2(sellUsd - costUsd),
      premiumPct: 0,
      reasons: add0 ? [`override:add${add0 > 0 ? '+' : ''}${add0}`] : [],
      override: Boolean(ov),
    };
  }

  const profit = baseProfit(costUsd);
  const prem = premiumFor(listing);
  const add = ov && Number(ov.addUsd) ? Number(ov.addUsd) : 0;
  const reasons = [...prem.reasons];
  if (add) reasons.push(`override:add${add > 0 ? '+' : ''}${add}`);

  // Qo'lda belgilangan qo'shimcha minusga ketsa ham foyda MIN_PROFIT_USD dan kam bo'lmasin
  const grossProfit = Math.max(MIN_PROFIT_USD, profit + costUsd * prem.pct + add);
  let sellUsd = round2((costUsd + grossProfit) * (1 + FEE_BUFFER));
  // Arzon skin: ustamalar sotuv narxini haddan oshirmasin (override bo'lmasa)
  if (!ov && costUsd < CHEAP_LIMIT_USD) {
    sellUsd = Math.min(sellUsd, round2(costUsd + CHEAP_MAX_MARKUP_USD));
  }
  return {
    sellUsd,
    costUsd,
    profitUsd: round2(sellUsd - costUsd),
    premiumPct: prem.pct,
    reasons,
    override: Boolean(ov),
  };
}
