// Buyurtmalar uchun saqlash qatlami.
//
//   - DATABASE_URL bo'lsa  -> Postgres (oxy.orders), tranzaksiya bilan.
//   - bo'lmasa             -> Vercel KV yoki lokal data/orders.json (eski yo'l).
//
// Funksiya imzolari ikkala holatda ham bir xil — API route'lar o'zgармайди.
//
// Holat mashinasi:
//   new        — buyurtma yaratildi, to'lov kutilmoqda
//   paid       — to'lov tasdiqlandi
//   fulfilling — skin sotib olinmoqda / trade tayyorlanmoqda
//   sent       — trade offer xaridorga yuborildi
//   done       — xaridor qabul qildi, yakunlandi
//   cancelled  — bekor qilindi
//   refunded   — pul qaytarildi

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { kvEnabled, kvGet, kvSet, kvSetNx } from './kv';
import { db, dbEnabled } from './db';
import { runMigrations } from './dbMigrate';
import { parseTradeUrl } from './steamTrade';
import { listProducts } from './productStore';
import { getSkinById } from './skinportFeed';

const KEY = 'oxy:orders';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'orders.json');

// Buyurtma summasi chegaralari (so'm). ENV bilan sozlanadi.
export const ORDER_MIN_UZS = Number(process.env.ORDER_MIN_UZS) || 5000;
export const ORDER_MAX_UZS = Number(process.env.ORDER_MAX_UZS) || 100_000_000;

export const ORDER_STATUSES = [
  'new',
  'pending',
  'paid',
  'fulfilling',
  'sent',
  'done',
  'cancelled',
  'refunded',
];

// Buyurtma qaysi holatlardan "paid" ga o'tishi mumkin
const PAYABLE_FROM = ['new', 'pending'];

export const STATUS_LABEL = {
  new: 'Yangi',
  pending: "To'lov kutilmoqda",
  paid: "To'landi",
  fulfilling: 'Yuborilmoqda',
  sent: 'Yuborildi',
  done: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
  refunded: 'Qaytarildi',
};

export const PAYMENT_STATUS_LABEL = {
  none: "To'lovsiz",
  pending: 'Kutilmoqda',
  paid: "To'langan",
  failed: 'Bekor / xato',
};

// ---------- Postgres: migratsiya bir marta ----------

let _migrated = null;
async function ensureMigrations() {
  if (!dbEnabled) return;
  if (!_migrated) {
    _migrated = runMigrations(db()).catch((e) => {
      _migrated = null; // keyingi so'rovда qayta urinsin
      throw e;
    });
  }
  return _migrated;
}

// ---------- Postgres: qator <-> buyurtma ----------

function toMs(v) {
  if (v instanceof Date) return v.getTime();
  const n = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(n) ? n : Date.now();
}

function rowToOrder(r) {
  if (!r) return null;
  return {
    id: r.id,
    ref: r.ref,
    createdAt: toMs(r.created_at),
    updatedAt: toMs(r.updated_at),
    status: r.status,
    customer: r.customer || { name: '', phone: '', tg: null },
    steam: r.steam || null,
    tradeUrl: r.trade_url || null,
    items: Array.isArray(r.items) ? r.items : [],
    total: Number(r.total) || 0,
    note: r.note || null,
    adminNote: r.admin_note || null,
    history: Array.isArray(r.history) ? r.history : [],
    payment: r.payment || {
      provider: null,
      status: 'none',
      amount: Number(r.total) || 0,
      providerTxnId: null,
      state: 0,
      createTime: null,
      performTime: null,
      cancelTime: null,
      reason: null,
    },
    fulfillment: r.fulfillment || {
      provider: null,
      status: 'none',
      items: [],
      error: null,
      startedAt: null,
      updatedAt: null,
    },
  };
}

async function pgInsertOrder(order) {
  const sql = db();
  await sql`
    insert into oxy.orders
      (id, ref, status, customer, steam, trade_url, items, total,
       note, admin_note, payment, fulfillment, history, created_at, updated_at)
    values (
      ${order.id}, ${order.ref}, ${order.status},
      ${sql.json(order.customer)}, ${order.steam ? sql.json(order.steam) : null}, ${order.tradeUrl},
      ${sql.json(order.items)}, ${order.total},
      ${order.note}, ${order.adminNote ?? null},
      ${sql.json(order.payment)}, ${sql.json(order.fulfillment)}, ${sql.json(order.history)},
      to_timestamp(${order.createdAt} / 1000.0), to_timestamp(${order.updatedAt} / 1000.0)
    )
  `;
  return order;
}

// Qatorni FOR UPDATE bilan o'qib, mutatorni qo'llab, qaytadan yozadi.
// Takroriy to'lov callback'lari poyga (race) qilmasin uchun tranzaksiyada.
//
// guard = { provider, providerTxnId, action, amount, status, raw } bo'lsa —
// avval oxy.payment_txns'ga INSERT ... ON CONFLICT DO NOTHING qilinadi. Agar
// shu (provider, providerTxnId) allaqachon bo'lsa -> { order, duplicate:true }
// va buyurtma HOLATI o'zgartirilmaydi (idempotent callback).
async function pgMutate(idOrRef, mutate, guard = null) {
  await ensureMigrations();
  const sql = db();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select * from oxy.orders
      where id = ${idOrRef} or ref = ${idOrRef}
      limit 1
      for update
    `;
    if (!rows.length) return { error: 'Topilmadi' };
    const order = rowToOrder(rows[0]);

    if (guard) {
      const ins = await tx`
        insert into oxy.payment_txns
          (order_id, provider, provider_txn_id, action, amount, status, raw)
        values (
          ${order.id}, ${guard.provider}, ${String(guard.providerTxnId)},
          ${guard.action || 'perform'}, ${guard.amount ?? order.total ?? 0},
          ${guard.status || 'paid'}, ${guard.raw ? tx.json(guard.raw) : null}
        )
        on conflict (provider, provider_txn_id) do nothing
        returning id
      `;
      if (!ins.length) return { order, duplicate: true };
    }

    const res = mutate(order);
    if (res === false) return { order }; // o'zgarishsiz
    order.updatedAt = Date.now();
    await tx`
      update oxy.orders set
        status      = ${order.status},
        customer    = ${tx.json(order.customer)},
        steam       = ${order.steam ? tx.json(order.steam) : null},
        trade_url   = ${order.tradeUrl},
        items       = ${tx.json(order.items)},
        total       = ${order.total},
        note        = ${order.note},
        admin_note  = ${order.adminNote ?? null},
        payment     = ${tx.json(order.payment)},
        fulfillment = ${tx.json(order.fulfillment)},
        history     = ${tx.json(order.history)},
        updated_at  = to_timestamp(${order.updatedAt} / 1000.0)
      where id = ${order.id}
    `;
    return { order };
  });
}

// ---------- past daraja: KV / lokal fayl (fallback) ----------

async function readAll() {
  if (kvEnabled) {
    const raw = await kvGet(KEY);
    if (raw) {
      try {
        const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(list)) return list;
      } catch (e) {
        console.error('[orderStore] KV parse xato:', e.message);
      }
    }
    return [];
  }
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[orderStore] local read xato:', e.message);
  }
  return [];
}

async function writeAll(list) {
  if (kvEnabled) {
    await kvSet(KEY, list);
    return;
  }
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// DB'siz (lokal) idempotentlik qo'riqchisi: KV SET NX, bo'lmasa process xotira.
const _seenTxn = new Set();
async function legacyGuardFresh(guard) {
  if (!guard) return true;
  const key = `oxy:paytxn:${guard.provider}:${guard.providerTxnId}`;
  if (kvEnabled) {
    try {
      return await kvSetNx(key, '1', 7 * 24 * 60 * 60);
    } catch {
      return true; // KV xato bo'lsa — bloklamaymiz
    }
  }
  if (_seenTxn.has(key)) return false;
  _seenTxn.add(key);
  return true;
}

// KV/fayl uchun: qatorni topib, mutatorni qo'llab, qaytadan yozadi.
async function legacyMutate(idOrRef, mutate, guard = null) {
  if (guard) {
    const fresh = await legacyGuardFresh(guard);
    if (!fresh) {
      const cur = await readAll();
      const found = cur.find((o) => o.id === idOrRef || o.ref === idOrRef);
      return found ? { order: found, duplicate: true } : { error: 'Topilmadi' };
    }
  }
  const all = await readAll();
  const idx = all.findIndex((o) => o.id === idOrRef || o.ref === idOrRef);
  if (idx === -1) return { error: 'Topilmadi' };
  const order = { ...all[idx] };
  const res = mutate(order);
  if (res === false) return { order };
  order.updatedAt = Date.now();
  const next = [...all];
  next[idx] = order;
  await writeAll(next);
  return { order };
}

// ---------- yordamchilar ----------

function makeRef() {
  const s = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex
  return `OXY-${s}`;
}

function sanitizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((it) => ({
      id: String(it.id || ''),
      name: String(it.name || ''),
      // client narxi bu yerda faqat vaqtinchalik — resolveItemPrices() uni
      // server (productStore / Skinport) narxi bilan almashtiradi.
      price: Math.max(0, Math.round(Number(it.price) || 0)),
      qty: Math.max(1, Math.min(20, Math.round(Number(it.qty) || 1))),
      kind: it.kind === 'skin' ? 'skin' : 'product',
      marketHashName: it.marketHashName ? String(it.marketHashName) : null,
    }))
    .filter((it) => it.id && it.name);
}

// NARX AVTORITETI: client yuborgan `price` ga ISHONMAYMIZ. Har bir savat
// bandining narxini server manbadan olamiz:
//   - product -> productStore (oxy:products / data/products.json)
//   - skin    -> Skinport katalog keshi (getSkinById)
// Band server tomonda topilmasa — butun buyurtma rad etiladi (jim narxlamaslik).
async function resolveItemPrices(items) {
  let productMap = null;
  if (items.some((it) => it.kind !== 'skin')) {
    const list = await listProducts('all').catch(() => []);
    productMap = new Map(list.map((p) => [p.id, p]));
  }

  const resolved = [];
  for (const it of items) {
    if (it.kind === 'skin') {
      const skin = await getSkinById(it.id).catch(() => null);
      if (!skin) {
        return { error: `Skin narxi yangilandi yoki topilmadi: ${it.name}. Sahifani yangilang.` };
      }
      const price = Math.max(0, Math.round(Number(skin.price) || 0));
      if (price <= 0) return { error: `Skin narxi noaniq: ${it.name}` };
      resolved.push({
        ...it,
        name: skin.name || it.name,
        price,
        marketHashName: skin.fullName || it.marketHashName || null,
      });
    } else {
      const product = productMap?.get(it.id);
      if (!product) {
        return { error: `Mahsulot topilmadi: ${it.name}. Sahifani yangilang.` };
      }
      const price = Math.max(0, Math.round(Number(product.price) || 0));
      if (price <= 0) return { error: `Mahsulot narxi noto'g'ri: ${it.name}` };
      resolved.push({ ...it, name: product.name || it.name, price });
    }
  }
  return { items: resolved };
}

export async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log('[ORDER]\n' + text);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error('[orderStore] telegram xato:', e.message);
  }
}

// Mutator'lar (ikkala backend ham shulardan foydalanadi) ------------------

function applyUpdatePatch(order, patch) {
  const now = Date.now();
  let touched = false;

  if (patch.status && ORDER_STATUSES.includes(patch.status) && patch.status !== order.status) {
    order.status = patch.status;
    order.history = [
      ...(order.history || []),
      { at: now, status: patch.status, by: patch.by || 'admin', note: patch.note || null },
    ];
    touched = true;
  } else if (patch.note) {
    order.history = [
      ...(order.history || []),
      { at: now, status: order.status, by: patch.by || 'admin', note: patch.note },
    ];
    touched = true;
  }

  if (patch.fulfillment) {
    order.fulfillment = { ...order.fulfillment, ...patch.fulfillment };
    touched = true;
  }
  if (typeof patch.adminNote === 'string') {
    order.adminNote = patch.adminNote.trim() || null;
    touched = true;
  }

  return touched;
}

function applyPaid(order, paymentPatch) {
  const now = Date.now();
  order.payment = {
    ...order.payment,
    ...paymentPatch,
    status: 'paid',
    performTime: paymentPatch.performTime || order.payment?.performTime || now,
  };
  if (PAYABLE_FROM.includes(order.status)) {
    order.status = 'paid';
    order.history = [
      ...(order.history || []),
      { at: now, status: 'paid', by: paymentPatch.by || 'payment', note: paymentPatch.note || null },
    ];
  }
}

// ---------- ochiq API ----------

export async function createOrder(input) {
  const rawItems = sanitizeItems(input.items);
  if (rawItems.length === 0) return { error: 'Savat bo\'sh' };

  const name = String(input.name || '').trim();
  const phone = String(input.phone || '').trim();
  if (!name || !phone) return { error: 'Ism va telefon majburiy' };

  const hasSkins = rawItems.some((it) => it.kind === 'skin');
  const trade = parseTradeUrl(input.tradeUrl);
  if (hasSkins && !trade) return { error: 'Skin uchun to\'g\'ri Steam Trade URL kerak' };

  // client narxlarini server narxlari bilan almashtiramiz
  const priced = await resolveItemPrices(rawItems);
  if (priced.error) return { error: priced.error };
  const items = priced.items;

  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  if (total <= 0) return { error: 'Buyurtma summasi noto\'g\'ri' };
  if (total < ORDER_MIN_UZS) {
    return { error: `Minimal buyurtma summasi ${ORDER_MIN_UZS.toLocaleString('ru-RU')} so'm` };
  }
  if (total > ORDER_MAX_UZS) {
    return { error: `Maksimal buyurtma summasi ${ORDER_MAX_UZS.toLocaleString('ru-RU')} so'm` };
  }
  const now = Date.now();
  const order = {
    id: crypto.randomBytes(12).toString('hex'),
    ref: makeRef(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
    customer: {
      name,
      phone,
      tg: String(input.tg || '').trim() || null,
    },
    steam: input.steam
      ? {
          steamid: String(input.steam.steamid || ''),
          name: String(input.steam.name || ''),
          profileUrl: String(input.steam.profileUrl || ''),
        }
      : null,
    tradeUrl: trade ? trade.url : null,
    items,
    total,
    note: String(input.note || '').trim() || null,
    adminNote: null,
    history: [{ at: now, status: 'new', by: 'system', note: 'Buyurtma yaratildi' }],
    payment: {
      provider: null, // 'test' | 'payme' | 'click' | 'manual'
      status: 'none', // none | pending | paid | failed
      amount: total, // so'm
      providerTxnId: null, // payme/click tranzaksiya id
      state: 0, // payme state (1=yaratildi, 2=to'landi, -1/-2=bekor)
      createTime: null,
      performTime: null,
      cancelTime: null,
      reason: null,
    },
    fulfillment: {
      provider: null, // 'manual' | 'test' | 'skinsback' | 'waxpeer'
      status: 'none', // none | processing | sent | done | error
      items: [], // [{ id, marketHashName, providerRef, state, error }]
      error: null,
      startedAt: null,
      updatedAt: null,
    },
  };

  if (dbEnabled) {
    await ensureMigrations();
    await pgInsertOrder(order);
  } else {
    const all = await readAll();
    await writeAll([order, ...all]);
  }

  const lines = items
    .map((i) => `• ${i.name} × ${i.qty} — ${(i.price * i.qty).toLocaleString('ru-RU')} so'm`)
    .join('\n');
  await notifyTelegram(
    `🛒 Yangi buyurtma ${order.ref}\n\n` +
      `👤 ${name}\n📞 ${phone}\n` +
      (order.customer.tg ? `✈️ ${order.customer.tg}\n` : '') +
      (order.steam?.profileUrl ? `🎮 ${order.steam.name} — ${order.steam.profileUrl}\n` : '') +
      (order.tradeUrl ? `🔗 ${order.tradeUrl}\n` : '') +
      (order.note ? `📝 ${order.note}\n` : '') +
      `\n${lines}\n\n💰 Jami: ${total.toLocaleString('ru-RU')} so'm`
  );

  return { order };
}

export async function getOrder(id) {
  if (dbEnabled) {
    await ensureMigrations();
    const sql = db();
    const rows = await sql`
      select * from oxy.orders where id = ${id} or ref = ${id} limit 1
    `;
    return rows.length ? rowToOrder(rows[0]) : null;
  }
  const all = await readAll();
  return all.find((o) => o.id === id || o.ref === id) || null;
}

export async function listOrders({ status, statuses } = {}) {
  if (dbEnabled) {
    await ensureMigrations();
    const sql = db();
    let rows;
    if (Array.isArray(statuses) && statuses.length) {
      rows = await sql`
        select * from oxy.orders where status in ${sql(statuses)} order by created_at desc
      `;
    } else if (status && status !== 'all') {
      rows = await sql`
        select * from oxy.orders where status = ${status} order by created_at desc
      `;
    } else {
      rows = await sql`select * from oxy.orders order by created_at desc`;
    }
    return rows.map(rowToOrder);
  }

  const all = await readAll();
  if (Array.isArray(statuses) && statuses.length) {
    return all.filter((o) => statuses.includes(o.status));
  }
  if (status && status !== 'all') return all.filter((o) => o.status === status);
  return all;
}

// Yetkazish (fulfillment) holatini yangilaydi.
export async function setFulfillment(idOrRef, patch = {}) {
  const mutate = (order) => {
    order.fulfillment = { ...order.fulfillment, ...patch, updatedAt: Date.now() };
  };
  return dbEnabled ? pgMutate(idOrRef, mutate) : legacyMutate(idOrRef, mutate);
}

export async function updateOrder(id, patch = {}) {
  const mutate = (order) => applyUpdatePatch(order, patch);
  return dbEnabled ? pgMutate(id, mutate) : legacyMutate(id, mutate);
}

// ---------- to'lov ----------

// To'lov provayderi tranzaksiya holatini yangilaydi (payme/click handlerlari uchun).
export async function setPayment(idOrRef, patch = {}) {
  const mutate = (order) => {
    order.payment = { ...order.payment, ...patch };
  };
  return dbEnabled ? pgMutate(idOrRef, mutate) : legacyMutate(idOrRef, mutate);
}

// To'lov muvaffaqiyatli — buyurtmani "paid" ga o'tkazadi.
// (provider, providerTxnId) berilgan bo'lsa — IDEMPOTENT: takroriy callback
// kelganda { order, duplicate:true } qaytadi, holat qayta o'zgarmaydi,
// Telegram xabari qayta yuborilmaydi, auto-fulfill qayta ishga tushmaydi.
export async function markOrderPaid(idOrRef, paymentPatch = {}) {
  const { provider, providerTxnId } = paymentPatch;
  const guard =
    provider && providerTxnId
      ? {
          provider,
          providerTxnId: String(providerTxnId),
          action: paymentPatch.action || 'perform',
          amount: paymentPatch.amount,
          status: 'paid',
          raw: paymentPatch.raw ?? null,
        }
      : null;

  const mutate = (order) => applyPaid(order, paymentPatch);
  const res = dbEnabled
    ? await pgMutate(idOrRef, mutate, guard)
    : await legacyMutate(idOrRef, mutate, guard);

  if (res?.order && !res.duplicate && !res.error) {
    notifyTelegram(
      `💰 To'lov qabul qilindi — ${res.order.ref}\n` +
        `${(res.order.total || 0).toLocaleString('ru-RU')} so'm` +
        (res.order.payment?.provider ? `\n(${res.order.payment.provider})` : '')
    ).catch(() => {});
  }

  return res;
}
