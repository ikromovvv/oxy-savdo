// Balansga qarab skin to'plamlari: sof funksiyalar (tarmoqsiz, testlanadi).
// pool — /api/skins dan olingan skinlar (price so'mda, count — bozordagi soni).

const GOOD_WEAR = new Set(['Factory New', 'Minimal Wear', 'Field-Tested']);

function usable(p) {
  return p && p.price > 0 && !p.availableAfter && !p.souvenir && (!p.wear || GOOD_WEAR.has(p.wear));
}

function uniq(list) {
  const seen = new Set();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

const byPopular = (a, b) => (b.count || 0) - (a.count || 0) || b.price - a.price;
const sum = (items) => items.reduce((s, p) => s + p.price, 0);

// Eng ommabop skinlar: balansga sig'adigan, soni eng ko'p
export function popularWithin(pool, budget, limit = 20) {
  // juda arzon (chiqindi) skinlar chiqmasligi uchun pastki chegara: balansning ~8%
  return uniq(pool.filter((p) => usable(p) && p.price <= budget && p.price >= budget * 0.08)).sort(byPopular).slice(0, limit);
}

// Slotlar bo'yicha to'plam yig'adi. slots: [[turlar | null, byudjet ulushi], ...]
// rank — shu slotlarda nechanchi eng ommabop nomzodni olish (variantlar xilma-xil bo'lishi uchun).
// Ulush ichiga sig'magan qism keyingi slotga o'tadi.
function build(pool, budget, slots, rank = 0, minFill = 0.35) {
  const out = [];
  let carry = 0;
  for (const [types, share] of slots) {
    const cap = budget * share + carry;
    const cands = uniq(
      pool.filter(
        (p) =>
          usable(p) &&
          (!types || types.includes(p.weaponType)) &&
          p.price <= cap &&
          p.price >= cap * minFill &&
          !out.some((o) => o.id === p.id || o.name === p.name)
      )
    ).sort(byPopular);
    const pick = cands[Math.min(rank, Math.max(0, cands.length - 1))];
    if (pick) {
      out.push(pick);
      carry = cap - pick.price;
    } else {
      carry = cap;
    }
  }
  return out;
}

const GUNS = ['rifle', 'sniper', 'pistol', 'smg', 'heavy'];
const SHOW = ['knife', 'gloves'];

// [kalit, slotlar, rank, minimal soni]
const TEMPLATES = [
  ['duo', [[null, 0.5], [null, 0.5]], 0, 2],
  ['lead', [[GUNS, 0.7], [GUNS, 0.3]], 0, 2],
  ['kit', [[['rifle'], 0.5], [['sniper'], 0.3], [['pistol'], 0.2]], 0, 2],
  ['premium', [[SHOW, 0.75], [['pistol', 'smg'], 0.25]], 0, 2],
  ['trio', [[GUNS, 0.34], [GUNS, 0.33], [GUNS, 0.33]], 0, 3],
  ['mix', [[GUNS, 0.22], [GUNS, 0.22], [GUNS, 0.22], [GUNS, 0.22], [GUNS, 0.12]], 0, 3],
  ['duo2', [[null, 0.5], [null, 0.5]], 1, 2],
  ['kit2', [[['rifle'], 0.5], [['sniper'], 0.3], [['pistol'], 0.2]], 1, 2],
  ['trio2', [[GUNS, 0.34], [GUNS, 0.33], [GUNS, 0.33]], 1, 3],
  ['lead2', [[GUNS, 0.7], [GUNS, 0.3]], 1, 2],
];

export function buildSets(pool, budget) {
  const b = Number(budget);
  if (!Number.isFinite(b) || b <= 0) return [];
  const seen = new Set();
  const sets = [];
  for (const [key, slots, rank, min] of TEMPLATES) {
    const items = build(pool, b, slots, rank);
    if (items.length < min || sum(items) > b) continue;
    const sig = items.map((p) => p.id).sort().join('|');
    if (seen.has(sig)) continue; // bir xil to'plam ikki marta chiqmasin
    seen.add(sig);
    sets.push({ key, items, total: sum(items) });
  }
  return sets;
}
