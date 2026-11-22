// Admin LIS katalogi: sevimli skinlar ro'yxati (market_hash_name).
// Saqlash: KV (prod) yoki data/lis-favorites.json (lokal) — qurilmalar orasida umumiy.

import fs from 'node:fs/promises';
import path from 'node:path';
import { kvEnabled, kvGet, kvSet } from './kv';

const KV_KEY = 'oxy:lis_favorites';
const FILE = () => path.join(process.cwd(), 'data', 'lis-favorites.json');
const MAX = 500;

function clean(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const n of arr) {
    const s = String(n || '').trim().slice(0, 200);
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, MAX);
}

export async function getFavorites() {
  try {
    if (kvEnabled) {
      const raw = await kvGet(KV_KEY);
      return clean(typeof raw === 'string' ? JSON.parse(raw) : raw);
    }
    return clean(JSON.parse(await fs.readFile(FILE(), 'utf8')));
  } catch {
    return [];
  }
}

// on=true — qo'shadi (ro'yxat boshiga), on=false — olib tashlaydi
export async function setFavorite(name, on) {
  const n = String(name || '').trim();
  if (!n) throw new Error('name_required');
  const list = (await getFavorites()).filter((x) => x !== n);
  if (on) list.unshift(n);
  const next = clean(list);
  if (kvEnabled) await kvSet(KV_KEY, JSON.stringify(next));
  else {
    await fs.mkdir(path.dirname(FILE()), { recursive: true });
    await fs.writeFile(FILE(), JSON.stringify(next, null, 2));
  }
  return next;
}
