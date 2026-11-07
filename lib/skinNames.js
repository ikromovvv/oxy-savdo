// Skin nomini tahlil qilish: qurol turi / naqsh / holat (wear) / StatTrak / Souvenir.
// Skinport va cs2shop kataloglari uchun umumiy.

const WEAR_NAMES = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
export { WEAR_NAMES };

const CATEGORY_WEAPONS = {
  rifle: ['AK-47', 'M4A4', 'M4A1-S', 'Galil AR', 'FAMAS', 'AUG', 'SG 553'],
  sniper: ['AWP', 'SSG 08', 'SCAR-20', 'G3SG1'],
  pistol: [
    'Desert Eagle', 'Glock-18', 'USP-S', 'P250', 'Five-SeveN', 'Tec-9',
    'CZ75-Auto', 'P2000', 'R8 Revolver', 'Dual Berettas',
  ],
  smg: ['MP9', 'MAC-10', 'MP7', 'UMP-45', 'P90', 'PP-Bizon', 'MP5-SD'],
  heavy: ['Nova', 'XM1014', 'Sawed-Off', 'MAG-7', 'M249', 'Negev'],
};

const KNIFE_KEYWORDS = [
  'Karambit', 'Bayonet', 'Bowie Knife', 'Butterfly Knife', 'Falchion Knife',
  'Flip Knife', 'Gut Knife', 'Huntsman Knife', 'Navaja Knife', 'Nomad Knife',
  'Paracord Knife', 'Shadow Daggers', 'Skeleton Knife', 'Stiletto Knife',
  'Survival Knife', 'Talon Knife', 'Ursus Knife', 'Classic Knife', 'Kukri Knife',
];

const GLOVE_KEYWORDS = [
  'Hand Wraps', 'Driver Gloves', 'Specialist Gloves', 'Sport Gloves',
  'Moto Gloves', 'Hydra Gloves', 'Broken Fang Gloves', 'Bloodhound Gloves',
];

export function classifyWeapon(weaponBase) {
  const clean = weaponBase.replace(/^★\s*/, '');
  for (const [slug, names] of Object.entries(CATEGORY_WEAPONS)) {
    if (names.includes(clean)) return slug;
  }
  if (weaponBase.startsWith('★')) {
    if (KNIFE_KEYWORDS.some((k) => clean.includes(k))) return 'knife';
    if (GLOVE_KEYWORDS.some((k) => clean.includes(k))) return 'gloves';
  }
  return null;
}

export function parseSkinName(fullName) {
  let rest = String(fullName || '').trim();
  let stattrak = false;
  let souvenir = false;

  if (rest.startsWith('StatTrak™ ')) {
    stattrak = true;
    rest = rest.slice('StatTrak™ '.length);
  }
  if (rest.startsWith('Souvenir ')) {
    souvenir = true;
    rest = rest.slice('Souvenir '.length);
  }

  const m = rest.match(/^(.*?)\s*\|\s*(.*?)(?:\s*\(([^)]+)\))?$/);
  if (!m) return null;

  const weaponBase = m[1].trim();
  const skinName = m[2].trim();
  const wear = m[3] ? m[3].trim() : null;
  if (!weaponBase || !skinName) return null;

  return { weaponBase, skinName, wear, stattrak, souvenir };
}

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/™/g, '')
    .replace(/★/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
