// Buyurtmalar uchun saqlash qatlami (Vercel KV yoki lokal data/orders.json).
// productStore.js bilan bir xil naqsh.
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
import { kvEnabled, kvGet, kvSet } from './kv';
import { parseTradeUrl } from './steamTrade';

const KEY = 'oxy:orders';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'orders.json');

export const ORDER_STATUSES = [
  'new',
  'paid',
  'fulfilling',
  'sent',
  'done',
  'cancelled',
  'refunded',
];

export const STATUS_LABEL = {
  new: 'Yangi',
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

// ---------- past daraja: hammasini o'qish/yozish ----------

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
      price: Math.max(0, Math.round(Number(it.price) || 0)),
      qty: Math.max(1, Math.round(Number(it.qty) || 1)),
      kind: it.kind === 'skin' ? 'skin' : 'product',
      marketHashName: it.marketHashName ? String(it.marketHashName) : null,
    }))
    .filter((it) => it.id && it.name);
}

async function notifyTelegram(text) {
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

// ---------- ochiq API ----------

export async function createOrder(input) {
  const items = sanitizeItems(input.items);
  if (items.length === 0) return { error: 'Savat bo\'sh' };

  const name = String(input.name || '').trim();
  const phone = String(input.phone || '').trim();
  if (!name || !phone) return { error: 'Ism va telefon majburiy' };

  const hasSkins = items.some((it) => it.kind === 'skin');
  const trade = parseTradeUrl(input.tradeUrl);
  if (hasSkins && !trade) return { error: 'Skin uchun to\'g\'ri Steam Trade URL kerak' };

  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
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

  const all = await readAll();
  await writeAll([order, ...all]);

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
  const all = await readAll();
  return all.find((o) => o.id === id || o.ref === id) || null;
}

export async function listOrders({ status, statuses } = {}) {
  const all = await readAll();
  if (Array.isArray(statuses) && statuses.length) {
    return all.filter((o) => statuses.includes(o.status));
  }
  if (status && status !== 'all') return all.filter((o) => o.status === status);
  return all;
}

// Yetkazish (fulfillment) holatini yangilaydi.
export async function setFulfillment(idOrRef, patch = {}) {
  const all = await readAll();
  const idx = all.findIndex((o) => o.id === idOrRef || o.ref === idOrRef);
  if (idx === -1) return { error: 'Topilmadi' };
  const order = { ...all[idx] };
  order.fulfillment = { ...order.fulfillment, ...patch, updatedAt: Date.now() };
  order.updatedAt = Date.now();
  const next = [...all];
  next[idx] = order;
  await writeAll(next);
  return { order };
}

export async function updateOrder(id, patch = {}) {
  const all = await readAll();
  const idx = all.findIndex((o) => o.id === id || o.ref === id);
  if (idx === -1) return { error: 'Topilmadi' };

  const order = { ...all[idx] };
  const now = Date.now();

  if (patch.status && ORDER_STATUSES.includes(patch.status) && patch.status !== order.status) {
    order.status = patch.status;
    order.history = [
      ...(order.history || []),
      { at: now, status: patch.status, by: patch.by || 'admin', note: patch.note || null },
    ];
  } else if (patch.note) {
    order.history = [
      ...(order.history || []),
      { at: now, status: order.status, by: patch.by || 'admin', note: patch.note },
    ];
  }

  if (patch.fulfillment) {
    order.fulfillment = { ...order.fulfillment, ...patch.fulfillment };
  }
  if (typeof patch.adminNote === 'string') {
    order.adminNote = patch.adminNote.trim() || null;
  }

  order.updatedAt = now;
  const next = [...all];
  next[idx] = order;
  await writeAll(next);
  return { order };
}

// ---------- to'lov ----------

// To'lov provayderi tranzaksiya holatini yangilaydi (payme/click handlerlari uchun).
export async function setPayment(idOrRef, patch = {}) {
  const all = await readAll();
  const idx = all.findIndex((o) => o.id === idOrRef || o.ref === idOrRef);
  if (idx === -1) return { error: 'Topilmadi' };
  const order = { ...all[idx] };
  order.payment = { ...order.payment, ...patch };
  order.updatedAt = Date.now();
  const next = [...all];
  next[idx] = order;
  await writeAll(next);
  return { order };
}

// To'lov muvaffaqiyatli — buyurtmani "paid" ga o'tkazadi (bir marta).
export async function markOrderPaid(idOrRef, paymentPatch = {}) {
  const all = await readAll();
  const idx = all.findIndex((o) => o.id === idOrRef || o.ref === idOrRef);
  if (idx === -1) return { error: 'Topilmadi' };

  const order = { ...all[idx] };
  const now = Date.now();
  order.payment = {
    ...order.payment,
    ...paymentPatch,
    status: 'paid',
    performTime: paymentPatch.performTime || order.payment?.performTime || now,
  };
  if (order.status === 'new') {
    order.status = 'paid';
    order.history = [
      ...(order.history || []),
      { at: now, status: 'paid', by: paymentPatch.by || 'payment', note: paymentPatch.note || null },
    ];
  }
  order.updatedAt = now;
  const next = [...all];
  next[idx] = order;
  await writeAll(next);

  notifyTelegram(
    `💰 To'lov qabul qilindi — ${order.ref}\n` +
      `${(order.total || 0).toLocaleString('ru-RU')} so'm` +
      (order.payment.provider ? `\n(${order.payment.provider})` : '')
  ).catch(() => {});

  return { order };
}
