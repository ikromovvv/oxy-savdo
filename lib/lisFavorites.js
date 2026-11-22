// Admin LIS katalogi: sevimli skinlar ro'yxati (market_hash_name).
// Saqlash: KV (prod) yoki data/lis-favorites.json (lokal) — qurilmalar orasida umumiy.

import fs from 'node:fs/promises';
import path from 'node:path';
import { kvEnabled, kvGet, kvSet } from './kv';

const sfx = (adminId) => (!adminId || adminId === 'main' ? '' : `:${String(adminId).replace(/[^a-z0-9_-]/gi, '')}`);
const KV_KEY = (adminId) => `oxy:lis_favorites${sfx(adminId)}`;
const FILE = (adminId) => path.join(process.cwd(), 'data', `lis-favorites${sfx(adminId).replace(':', '-')}.json`);
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

export async function getFavorites(adminId) {
  try {
    if (kvEnabled) {
      const raw = await kvGet(KV_KEY(adminId));
      return clean(typeof raw === 'string' ? JSON.parse(raw) : raw);
    }
    return clean(JSON.parse(await fs.readFile(FILE(adminId), 'utf8')));
  } catch {
    return [];
  }
}

// on=true — qo'shadi (ro'yxat boshiga), on=false — olib tashlaydi
export async function setFavorite(name, on, adminId) {
  const n = String(name || '').trim();
  if (!n) throw new Error('name_required');
  const list = (await getFavorites(adminId)).filter((x) => x !== n);
  if (on) list.unshift(n);
  const next = clean(list);
  if (kvEnabled) await kvSet(KV_KEY(adminId), JSON.stringify(next));
  else {
    await fs.mkdir(path.dirname(FILE(adminId)), { recursive: true });
    await fs.writeFile(FILE(adminId), JSON.stringify(next, null, 2));
  }
  return next;
}
