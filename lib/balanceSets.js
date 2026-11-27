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

// Bitta eng kuchli skin: balansning 70–100% oralig'idagi eng qimmati (ommabopligi bo'yicha tanlanadi)
function bestSingle(pool, budget) {
  const c = uniq(pool.filter((p) => usable(p) && p.price <= budget && p.price >= budget * 0.7));
  if (!c.length) return [];
  c.sort((a, b) => b.price - a.price || byPopular(a, b));
  return [c[0]];
}

// To'liq qurol to'plami: rifle + sniper + pistol, byudjet 50/30/20 qilib bo'linadi
function weaponKit(pool, budget) {
  const slots = [
    ['rifle', 0.5],
    ['sniper', 0.3],
    ['pistol', 0.2],
  ];
  const out = [];
  let carry = 0;
  for (const [type, share] of slots) {
    const cap = budget * share + carry;
    const pick = uniq(pool.filter((p) => usable(p) && p.weaponType === type && p.price <= cap && p.price >= cap * 0.35 && !out.some((o) => o.id === p.id)))
      .sort(byPopular)[0];
    if (pick) {
      out.push(pick);
      carry = cap - pick.price;
    } else {
      carry = cap;
    }
  }
  return out.length >= 2 ? out : [];
}

// Arzon-mazali: 4–5 ta turli turdagi ommabop skin, har biri byudjetning ~1/5 ichida
function cheapMix(pool, budget) {
  const cap = budget / 4.5;
  const cands = uniq(pool.filter((p) => usable(p) && p.price <= cap && p.price >= cap * 0.25)).sort(byPopular);
  const usedTypes = new Set();
  const out = [];
  for (const p of cands) {
    if (usedTypes.has(p.weaponType)) continue;
    usedTypes.add(p.weaponType);
    out.push(p);
    if (out.length === 5) break;
  }
  // byudjetga sig'masa oxirgisini olib tashlaymiz
  while (out.length && sum(out) > budget) out.pop();
  return out.length >= 3 ? out : [];
}

export function buildSets(pool, budget) {
  const b = Number(budget);
  if (!Number.isFinite(b) || b <= 0) return [];
  const sets = [
    { key: 'single', items: bestSingle(pool, b) },
    { key: 'kit', items: weaponKit(pool, b) },
    { key: 'mix', items: cheapMix(pool, b) },
  ];
  return sets.filter((s) => s.items.length).map((s) => ({ ...s, total: sum(s.items) }));
}
