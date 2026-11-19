// lib/skinMetaData.json ni CSGO-API'dan qayta yaratadi (yangi skinlar rasm/rariteti uchun).
//   node scripts/gen-skin-meta.mjs
// Format: { "<normallashtirilgan nom>": [rasmURL, rariteti, rang, minFloat, maxFloat] }

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FEED_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'skinMetaData.json');

const normalize = (name) =>
  String(name || '').replace(/^★\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase();

const res = await fetch(FEED_URL);
if (!res.ok) throw new Error(`CSGO-API HTTP ${res.status}`);
const list = await res.json();

const map = {};
for (const it of list) {
  if (!it?.name) continue;
  const k = normalize(it.name);
  if (map[k]) continue;
  map[k] = [
    it.image || '',
    it.rarity?.name || '',
    it.rarity?.color || '',
    typeof it.min_float === 'number' ? it.min_float : null,
    typeof it.max_float === 'number' ? it.max_float : null,
  ];
}
writeFileSync(OUT, JSON.stringify(map));
console.log(`${Object.keys(map).length} ta skin -> ${OUT}`);
