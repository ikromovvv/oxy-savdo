// Kovrik / aksessuar mahsulotlari uchun saqlash qatlami.
//
// - Vercel KV (Upstash) ulangan bo'lsa  -> hammasi "oxy:products" kalitida.
// - Aks holda (lokal ishlab chiqish)    -> data/products.json faylida.
//
// Birinchi o'qishda do'kon bo'sh bo'lsa, lib/products.js dagi statik ro'yxat
// bilan "urug'lantiriladi" (seed), shunda sayt hech qachon bo'sh turmaydi.
//
// Skinlar bu yerda EMAS — ular LIS-SKINS eksportidan real vaqtda olinadi.

import { promises as fs } from 'fs';
import path from 'path';
import { kvEnabled, kvGet, kvSet } from './kv';
import { products as seedProducts } from './products';

const KEY = 'oxy:products';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'products.json');

// kovrik/aksessuar bo'lmagan (skin) yozuvlar bu yerda saqlanmaydi
export const MANAGED_CATEGORIES = ['kovriklar', 'aksessuar'];

function seed() {
  return seedProducts
    .filter((p) => MANAGED_CATEGORIES.includes(p.category))
    .map((p) => ({ ...p }));
}

async function readLocal() {
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[productStore] local read xato:', e.message);
  }
  const s = seed();
  await writeLocal(s);
  return s;
}

async function writeLocal(list) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(list, null, 2), 'utf8');
}

async function readAll() {
  if (kvEnabled) {
    const raw = await kvGet(KEY);
    if (raw) {
      try {
        const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(list)) return list;
      } catch (e) {
        console.error('[productStore] KV parse xato:', e.message);
      }
    }
    const s = seed();
    await kvSet(KEY, s);
    return s;
  }
  return readLocal();
}

async function writeAll(list) {
  if (kvEnabled) {
    await kvSet(KEY, list);
    return;
  }
  await writeLocal(list);
}

// ---------- ochiq API ----------

export async function listProducts(category) {
  const all = await readAll();
  if (!category || category === 'all') return all;
  return all.filter((p) => p.category === category);
}

export async function getProductById(id) {
  const all = await readAll();
  return all.find((p) => p.id === id) || null;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uniqueId(base, all) {
  let id = base || `mahsulot-${Date.now()}`;
  let n = 2;
  const taken = new Set(all.map((p) => p.id));
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

// kelgan xom ma'lumotni tozalab, to'g'ri shaklga keltiradi
export function normalize(input, existing = null) {
  const out = existing ? { ...existing } : {};

  if (input.name != null) out.name = String(input.name).trim();

  if (input.category != null) {
    out.category = MANAGED_CATEGORIES.includes(input.category) ? input.category : 'kovriklar';
  } else if (!out.category) {
    out.category = 'kovriklar';
  }

  if (input.price != null) {
    const n = Number(String(input.price).replace(/\s/g, ''));
    out.price = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }

  if (input.tone != null) out.tone = String(input.tone).trim() || 'from-white/10 to-black';
  else if (!out.tone) out.tone = 'from-white/10 to-black';

  // rasm(lar)
  if (input.images != null || input.image != null) {
    let imgs = Array.isArray(input.images)
      ? input.images
      : typeof input.images === 'string'
        ? input.images.split('\n')
        : [];
    imgs = imgs.map((s) => String(s).trim()).filter(Boolean);
    if (input.image && !imgs.includes(String(input.image).trim())) {
      imgs.unshift(String(input.image).trim());
    }
    out.images = imgs;
    out.image = imgs[0] || '';
  }

  // qisqa tavsif — {uz, ru} yoki bitta satr
  if (input.short != null) {
    if (typeof input.short === 'string') {
      out.short = { uz: input.short.trim(), ru: input.short.trim() };
    } else {
      out.short = {
        uz: String(input.short.uz || '').trim(),
        ru: String(input.short.ru || input.short.uz || '').trim(),
      };
    }
  } else if (!out.short) {
    out.short = { uz: '', ru: '' };
  }

  // badge — ixtiyoriy
  if (input.badge !== undefined) {
    if (!input.badge || (typeof input.badge === 'object' && !input.badge.uz && !input.badge.ru)) {
      delete out.badge;
    } else if (typeof input.badge === 'string') {
      out.badge = { uz: input.badge.trim(), ru: input.badge.trim() };
    } else {
      out.badge = {
        uz: String(input.badge.uz || '').trim(),
        ru: String(input.badge.ru || input.badge.uz || '').trim(),
      };
    }
  }

  if (input.featured !== undefined) out.featured = Boolean(input.featured);

  // xususiyatlar
  if (input.specs !== undefined) {
    out.specs = (Array.isArray(input.specs) ? input.specs : [])
      .map((s) => ({
        uz: String(s.uz || '').trim(),
        ru: String(s.ru || s.uz || '').trim(),
        v: String(s.v ?? s.value ?? '').trim(),
      }))
      .filter((s) => s.uz || s.v);
  } else if (!out.specs) {
    out.specs = [];
  }

  return out;
}

export function validate(p) {
  const errors = [];
  if (!p.name) errors.push('Nom majburiy');
  if (!p.category) errors.push('Kategoriya majburiy');
  if (!Number.isFinite(p.price) || p.price < 0) errors.push('Narx noto\'g\'ri');
  return errors;
}

export async function createProduct(input) {
  const all = await readAll();
  const data = normalize(input);
  const errors = validate(data);
  if (errors.length) return { error: errors.join(', ') };

  data.id = await uniqueId(input.id ? slugify(input.id) : slugify(data.name), all);
  const now = Date.now();
  data.createdAt = now;
  data.updatedAt = now;

  const next = [data, ...all];
  await writeAll(next);
  return { item: data };
}

export async function updateProduct(id, input) {
  const all = await readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return { error: 'Topilmadi' };

  const data = normalize(input, all[idx]);
  const errors = validate(data);
  if (errors.length) return { error: errors.join(', ') };

  data.id = id; // id o'zgarmaydi
  data.updatedAt = Date.now();

  const next = [...all];
  next[idx] = data;
  await writeAll(next);
  return { item: data };
}

export async function deleteProduct(id) {
  const all = await readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return { error: 'Topilmadi' };
  await writeAll(next);
  return { ok: true };
}
