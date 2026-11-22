// lib/skinColors.json ni yaratadi: har bir skin rasmidan dominant ranglar (admin katalog "Rang" filtri uchun).
//   node scripts/gen-skin-colors.mjs        (yangi skinlar chiqqanda: avval gen-skin-meta.mjs, keyin shu)
// Format: { "<normallashtirilgan nom>": "red,black" }  (ranglar ulushi bo'yicha, eng ko'pi birinchi)
// Rasm yuklanadi (128x96), shaffof bo'lmagan piksellar HSV bo'yicha guruhlanadi.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PNG } from 'pngjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib');
const META = JSON.parse(readFileSync(path.join(dir, 'skinMetaData.json'), 'utf8'));
const OUT = path.join(dir, 'skinColors.json');
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

function bucket(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  if (v < 0.2) return 'black';
  if (s < 0.16) return v > 0.78 ? 'white' : v < 0.32 ? 'black' : 'gray';
  let h;
  const rr = r / 255, gg = g / 255, bb = b / 255;
  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 14 || h >= 346) return 'red';
  if (h < 42) return v < 0.45 ? 'brown' : 'orange';
  if (h < 70) return v < 0.45 ? 'brown' : 'yellow';
  if (h < 165) return 'green';
  if (h < 258) return 'blue';
  if (h < 296) return 'purple';
  return 'pink';
}

function analyze(buf) {
  const png = PNG.sync.read(buf);
  const cnt = {};
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] < 140) continue;
    const c = bucket(png.data[i], png.data[i + 1], png.data[i + 2]);
    cnt[c] = (cnt[c] || 0) + 1;
    n++;
  }
  if (!n) return '';
  const frac = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, v / n]));
  const tags = [];
  for (const [c, f] of Object.entries(frac)) {
    if (c === 'gray') continue; // metall/kulrang — rang emas
    const min = c === 'black' ? 0.45 : c === 'white' ? 0.14 : c === 'brown' ? 0.12 : 0.06;
    if (f >= min) tags.push([c, f]);
  }
  if (!tags.length) {
    // hech biri chegaradan o'tmasa — eng katta xromatik (yoki qora) rangni olamiz
    const top = Object.entries(frac).filter(([c]) => c !== 'gray').sort((a, b) => b[1] - a[1])[0];
    if (top) tags.push(top);
  }
  return tags.sort((a, b) => b[1] - a[1]).map(([c]) => c).join(',');
}

const keys = Object.keys(META).filter((k) => !(k in prev));
console.log(`${Object.keys(prev).length} ta tayyor, ${keys.length} ta yangi`);
const out = { ...prev };
let done = 0;
let failed = 0;

async function one(k) {
  const url = META[k]?.[0];
  if (!url) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${url}/128fx96f`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      out[k] = analyze(Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      if (attempt === 2) {
        failed++;
        return;
      }
    }
  }
}

const queue = [...keys];
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (queue.length) {
      await one(queue.shift());
      if (++done % 200 === 0) console.log(`${done}/${keys.length}`);
    }
  })
);

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted));
console.log(`tayyor: ${Object.keys(sorted).length} ta, xato: ${failed}`);
