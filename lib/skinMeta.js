// Skin kartasi uchun ko'rinish metama'lumotlari: wear (holati) bar va
// rariteti rangi.
//
// DIQQAT: LIS-SKINS narxlar eksportida aniq "float" qiymati ham, rariteti
// ham YO'Q. Shuning uchun:
//  • wear bar — skinning "exterior" (Factory New / Field-Tested ...) oralig'ini
//    ko'rsatadi, marker shu oraliq o'rtasiga qo'yiladi (taxminiy).
//  • rariteti — ★ buyumlar (pichoq/qo'lqop) doim "oltin". Qolganlari nom
//    bo'yicha BARQAROR (deterministik) tarzda taxmin qilinadi — marketplace
//    ko'rinishini berish uchun; 100% aniq emas.

// CS2 exterior -> float oralig'i (0..1)
export const WEAR_TIERS = [
  { key: 'FN', name: 'Factory New', min: 0.0, max: 0.07 },
  { key: 'MW', name: 'Minimal Wear', min: 0.07, max: 0.15 },
  { key: 'FT', name: 'Field-Tested', min: 0.15, max: 0.38 },
  { key: 'WW', name: 'Well-Worn', min: 0.38, max: 0.45 },
  { key: 'BS', name: 'Battle-Scarred', min: 0.45, max: 1.0 },
];

// Wear bar gradienti — segmentlar float oralig'iga proporsional
export const WEAR_GRADIENT =
  'linear-gradient(90deg,' +
  '#22c55e 0%,#22c55e 7%,' +
  '#a3e635 7%,#a3e635 15%,' +
  '#eab308 15%,#eab308 38%,' +
  '#f97316 38%,#f97316 45%,' +
  '#ef4444 45%,#ef4444 100%)';

export function wearInfo(wear) {
  if (!wear) return null;
  const t = WEAR_TIERS.find((x) => x.name === wear || x.key === wear);
  if (!t) return null;
  const mid = (t.min + t.max) / 2;
  return {
    ...t,
    startPct: t.min * 100,
    endPct: t.max * 100,
    midPct: mid * 100,
  };
}

// CS2 rariteti neon ranglari (marketplace standarti bilan bir xil)
export const RARITIES = {
  consumer: { key: 'consumer', label: 'Consumer', color: '#b0c3d9' },
  industrial: { key: 'industrial', label: 'Industrial', color: '#5e98d9' },
  milspec: { key: 'milspec', label: 'Mil-Spec', color: '#4b69ff' },
  restricted: { key: 'restricted', label: 'Restricted', color: '#8847ff' },
  classified: { key: 'classified', label: 'Classified', color: '#d32ce6' },
  covert: { key: 'covert', label: 'Covert', color: '#eb4b4b' },
  contraband: { key: 'contraband', label: 'Contraband', color: '#ffd700' },
  gold: { key: 'gold', label: 'Extraordinary', color: '#ffd700' }, // pichoq / qo'lqop
};

// hex -> "r,g,b" (CSS rgba() ichida ishlatish uchun, masalan neon glow)
export function rarityRgb(hex) {
  const h = String(hex || '#4b69ff').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
}

// CSGO-API (ByMykel) rariteti nomi -> qisqa label + zaxira rang
const API_RARITY = {
  'Consumer Grade': RARITIES.consumer,
  'Industrial Grade': RARITIES.industrial,
  'Mil-Spec Grade': RARITIES.milspec,
  Restricted: RARITIES.restricted,
  Classified: RARITIES.classified,
  Covert: RARITIES.covert,
  Contraband: RARITIES.contraband,
  Extraordinary: RARITIES.gold, // pichoq / qo'lqop
};

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rarityInfo(product) {
  if (!product) return RARITIES.milspec;

  // 1) CSGO-API'dan HAQIQIY rariteti kelgan bo'lsa — o'shani ishlatamiz
  if (product.rarity || product.rarityColor) {
    const known = product.rarity && API_RARITY[product.rarity];
    if (known && !product.rarityColor) return known;
    return {
      key: known?.key || 'api',
      label: known?.label || product.rarity || 'Skin',
      color: product.rarityColor || known?.color || RARITIES.milspec.color,
      real: true,
    };
  }

  // 2) ★ buyumlar (pichoq/qo'lqop) — doim oltin
  if (product.weaponType === 'knife' || product.weaponType === 'gloves') {
    return RARITIES.gold;
  }

  // 3) zaxira: nom bo'yicha barqaror (deterministik) taxmin
  const src = product.fullName || product.name || product.id || '';
  const r = hashStr(src) % 100;
  if (r < 45) return RARITIES.milspec;
  if (r < 75) return RARITIES.restricted;
  if (r < 92) return RARITIES.classified;
  return RARITIES.covert;
}
