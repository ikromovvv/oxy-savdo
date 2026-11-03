// Rozigrysh boti: /start -> shartlarni tekshiradi (kanalga obuna + saytda Steam bilan kirish).
// Alohida bot tokeni: GIVEAWAY_BOT_TOKEN (asosiy bot tokenidan farqli). Bot kanalda ADMIN bo'lishi kerak
// (aks holda Telegram getChatMember'ga ruxsat bermaydi).
//
// Webhook:
//   https://api.telegram.org/bot<GIVEAWAY_BOT_TOKEN>/setWebhook
//     ?url=https://<domen>/api/giveaway/webhook
//     &secret_token=<GIVEAWAY_WEBHOOK_SECRET>
//     &allowed_updates=["message","callback_query"]

import { createSessionToken, verifySessionToken } from './session';
import { getEntry, isEligible, linkSteam, setSubscribed, upsertEntry } from './giveawayStore';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');
const channelName = () => (process.env.GIVEAWAY_CHANNEL || process.env.TG_CHANNEL || 'oxyskinshop').replace(/^@/, '');
// Yopiq kanal bo'lsa GIVEAWAY_CHANNEL raqamli ID (-100...) va GIVEAWAY_CHANNEL_LINK (taklif havolasi) beriladi
const channelId = () => (/^-?\d+$/.test(channelName()) ? Number(channelName()) : `@${channelName()}`);
const channelLink = () => process.env.GIVEAWAY_CHANNEL_LINK || `https://t.me/${channelName()}`;
const channelLabel = () => (/^-?\d+$/.test(channelName()) ? 'skin kanali' : `@${channelName()}`);
const LINK_TTL_MS = 30 * 60 * 1000;

export const giveawayEnabled = () => Boolean(process.env.GIVEAWAY_BOT_TOKEN);

export async function tgCall(method, body) {
  const token = process.env.GIVEAWAY_BOT_TOKEN;
  if (!token) throw new Error('GIVEAWAY_BOT_TOKEN sozlanmagan');
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    const err = new Error(data.description || `telegram_${res.status}`);
    err.code = data.error_code || res.status;
    throw err;
  }
  return data.result;
}

// Kanalga obuna bo'lganmi? Tekshirib bo'lmasa (bot admin emas) — xato tashlaydi.
export async function isSubscribed(userId) {
  const m = await tgCall('getChatMember', { chat_id: channelId(), user_id: userId });
  return ['member', 'administrator', 'creator'].includes(m.status) || (m.status === 'restricted' && m.is_member === true);
}

// Saytga o'tish uchun imzolangan, 30 daqiqalik havola tokeni
export function makeLinkToken(tgId, username) {
  return createSessionToken({ typ: 'gw', tg: Number(tgId), u: username || null, exp: Date.now() + LINK_TTL_MS });
}
export function readLinkToken(token) {
  const p = verifySessionToken(token);
  return p && p.typ === 'gw' && Number.isFinite(p.tg) ? { tgId: p.tg, username: p.u || null } : null;
}

const mark = (ok) => (ok ? '✅' : '❌');

export function statusText(entry, { subUnknown = false } = {}) {
  const sub = Boolean(entry?.subscribed);
  const steam = Boolean(entry?.steamid);
  // obunani tekshirib bo'lmagan bo'lsa (bot kanalda admin emas) ❌ emas, ⚠️ ko'rsatamiz
  let t = `${subUnknown ? '⚠️' : mark(sub)} 1) ${channelLabel()} kanaliga obuna\n${mark(steam)} 2) Saytda Steam orqali kirish`;
  t += isEligible(entry)
    ? "\n\n🎉 Siz rozigrishda ishtirok etyapsiz! Omad tilaymiz."
    : "\n\nIkkala shart bajarilganda ishtirokchi bo'lasiz.";
  return t;
}

function keyboard(entry, tgId, username) {
  const rows = [];
  if (!entry?.subscribed) rows.push([{ text: '📢 Kanalga o‘tish', url: channelLink() }]);
  if (!entry?.steamid) {
    rows.push([{ text: '🎮 Saytda Steam bilan kirish', url: `${SITE}/rozigrish?t=${encodeURIComponent(makeLinkToken(tgId, username))}` }]);
  }
  rows.push([{ text: '🔄 Qayta tekshirish', callback_data: 'check' }]);
  return { inline_keyboard: rows };
}

// Obunani tekshirib, holatni yangilaydi. Qaytaradi: { entry, subError }
export async function refreshEntry(user) {
  const tgId = user.id;
  const username = user.username || null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || null;
  let subscribed = false;
  let subError = null;
  try {
    subscribed = await isSubscribed(tgId);
  } catch (e) {
    subError = e.message || 'check_failed';
    console.error('[giveaway] getChatMember xato:', subError);
  }
  const entry = await upsertEntry({ tgId, username, name, subscribed });
  return { entry, subError };
}

async function sendStatus(chatId, user, intro) {
  const { entry, subError } = await refreshEntry(user);
  const body = subError
    ? "Obunani tekshirib bo'lmadi. Bot kanalda admin bo'lishi kerak — admin bilan bog'laning."
    : statusText(entry);
  await tgCall('sendMessage', {
    chat_id: chatId,
    text: `${intro ? `${intro}\n\n` : ''}${body}`,
    reply_markup: keyboard(entry, user.id, user.username),
  });
}

// Webhook yangilanishi
export async function handleGiveawayUpdate(update) {
  if (update?.message) {
    const m = update.message;
    if (m.chat?.type !== 'private' || !m.from) return { skip: 'not_private' };
    // Kanal postini botga forward qilsa — kanalning raqamli ID'sini qaytaradi (yopiq kanal sozlash uchun)
    const fwd = m.forward_origin?.chat || m.forward_from_chat;
    if (fwd?.type === 'channel') {
      await tgCall('sendMessage', { chat_id: m.chat.id, text: `Kanal ID: ${fwd.id}` });
      return { ok: true };
    }
    await sendStatus(
      m.chat.id,
      m.from,
      "🎁 OXY SAVDO rozigrishi!\nIshtirok etish uchun 2 ta shartni bajaring:"
    );
    return { ok: true };
  }
  if (update?.callback_query) {
    const q = update.callback_query;
    await tgCall('answerCallbackQuery', { callback_query_id: q.id }).catch(() => {});
    if (q.data === 'check' && q.message?.chat?.id) {
      await sendStatus(q.message.chat.id, q.from, null);
      return { ok: true };
    }
  }
  return { skip: 'ignored' };
}

// Sayt tomonidan chaqiriladi: Steam bog'landi -> obunani qayta tekshirib, botda xabar yuboradi
export async function completeLink({ tgId, username, steamid, steamName }) {
  const res = await linkSteam({ tgId, username, steamid, steamName });
  if (res.error) return res;
  let subscribed = res.entry.subscribed;
  let subUnknown = false;
  try {
    subscribed = await isSubscribed(tgId);
    await setSubscribed(tgId, subscribed);
  } catch (e) {
    subUnknown = true;
    console.error('[giveaway] obuna qayta tekshirilmadi:', e.message);
  }
  const entry = (await getEntry(tgId)) || res.entry;
  if (giveawayEnabled()) {
    tgCall('sendMessage', { chat_id: tgId, text: `✅ Steam akkaunt ulandi.\n\n${statusText(entry, { subUnknown })}${subUnknown ? "\n\n⚠️ Obunani tekshirib bo'lmadi: bot kanalda admin bo'lishi kerak. Admin bilan bog'laning." : ''}` }).catch(() => {});
  }
  return { entry, eligible: isEligible(entry) };
}
