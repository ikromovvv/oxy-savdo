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
import { getEntry, isEligible, linkSteam, listEntries, listWinners, recordWinner, resetEntries, setSubscribed, upsertEntry } from './giveawayStore';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');
const channelName = () => (process.env.GIVEAWAY_CHANNEL || process.env.TG_CHANNEL || 'oxyskinshop').trim().replace(/^@\s*/, '');
// Yopiq kanal bo'lsa GIVEAWAY_CHANNEL raqamli ID (-100...) va GIVEAWAY_CHANNEL_LINK (taklif havolasi) beriladi
// Kanal ID'si doim manfiy (-100...); minus tushib qolgan bo'lsa ham to'g'rilab olamiz
const channelId = () => {
  const c = channelName().trim();
  return /^-?\d+$/.test(c) ? Number(c.startsWith('-') ? c : `-${c}`) : `@${c}`;
};
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
    ? `Obunani tekshirib bo'lmadi. Bot kanalda admin bo'lishi kerak — admin bilan bog'laning.
(${subError})`
    : statusText(entry);
  await tgCall('sendMessage', {
    chat_id: chatId,
    text: `${intro ? `${intro}\n\n` : ''}${body}`,
    reply_markup: keyboard(entry, user.id, user.username),
  });
}

// ---- Kanalga rozigrish posti (Randomizer botiga o'xshash): admin botda /yangi yozadi, bot kanalga post + "Qatnashish" tugmasi qo'yadi
let botUsernameCache = null;
async function botUsername() {
  if (process.env.GIVEAWAY_BOT_USERNAME) return process.env.GIVEAWAY_BOT_USERNAME.replace(/^@/, '');
  if (!botUsernameCache) botUsernameCache = (await tgCall('getMe', {})).username;
  return botUsernameCache;
}

// Bot adminlari: GIVEAWAY_ADMINS (usernamelar, vergul bilan; standart: ikromovvvl) yoki kanal adminlari
const adminUsernames = () =>
  (process.env.GIVEAWAY_ADMINS || 'ikromovvvl')
    .split(',')
    .map((x) => x.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean);

async function isBotAdmin(user) {
  if (user.username && adminUsernames().includes(user.username.toLowerCase())) return true;
  try {
    const m = await tgCall('getChatMember', { chat_id: channelId(), user_id: user.id });
    return m.status === 'administrator' || m.status === 'creator';
  } catch {
    return false;
  }
}

async function eligibleCount() {
  return (await listEntries()).filter(isEligible).length;
}

// GIVEAWAY_WEBAPP (BotFather /newapp dagi qisqa nom) berilsa, "Qatnashish" tugmasi Mini App'ni ochadi (Randomizer kabi),
// aks holda oddiy callback tugma ishlaydi. Mini App'ga xabar ID'si startapp orqali uzatiladi (tugmadagi sonni yangilash uchun).
async function postKeyboard(msgId = null) {
  const bot = await botUsername();
  const app = (process.env.GIVEAWAY_WEBAPP || '').trim();
  const count = await eligibleCount();
  const join = app
    ? { text: `🎁 Qatnashish · ${count}`, url: `https://t.me/${bot}/${app}${msgId ? `?startapp=${msgId}` : ''}` }
    : { text: `🎁 Qatnashish · ${count}`, callback_data: 'join' };
  return {
    inline_keyboard: [[join], [{ text: '🤖 Shartlarni tekshirish', url: `https://t.me/${bot}?start=check` }]],
  };
}

const POST_RULES = "\n\nShartlar:\n1) Kanalga obuna bo'lish\n2) Saytda Steam orqali kirish (botda tekshiriladi)\n\nQatnashish uchun pastdagi tugmani bosing 👇";

// /yangi <matn> (yoki rasm + izohda /yangi <matn>) — faqat adminlar uchun
async function handleNewGiveaway(m) {
  if (!(await isBotAdmin(m.from))) {
    await tgCall('sendMessage', { chat_id: m.chat.id, text: "Bu buyruq faqat kanal adminlari uchun." });
    return;
  }
  const raw = m.text || m.caption || '';
  const body = raw.replace(/^\/yangi(@\w+)?/i, '').trim();
  if (!body) {
    await tgCall('sendMessage', {
      chat_id: m.chat.id,
      text: "Yangi rozigrish posti:\n/yangi Sovg'a: AK-47 | Redline\nRasm bilan: rasmni yuborib, izohiga /yangi va matnni yozing.",
    });
    return;
  }
  const text = `${body}${POST_RULES}`;
  const reply_markup = await postKeyboard();
  const photo = m.photo?.length ? m.photo[m.photo.length - 1].file_id : null;
  const sent = photo
    ? await tgCall('sendPhoto', { chat_id: channelId(), photo, caption: text.slice(0, 1024), reply_markup })
    : await tgCall('sendMessage', { chat_id: channelId(), text, reply_markup });
  if (process.env.GIVEAWAY_WEBAPP) {
    // Mini App havolasiga xabar ID'sini qo'shamiz
    await tgCall('editMessageReplyMarkup', {
      chat_id: channelId(),
      message_id: sent.message_id,
      reply_markup: await postKeyboard(sent.message_id),
    }).catch((e) => console.error('[giveaway] tugma yangilanmadi:', e.message));
  }
  await tgCall('sendMessage', { chat_id: m.chat.id, text: `✅ Post kanalga yuborildi (xabar ${sent.message_id}).` });
}

const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const MAX_WINNERS = 20;

// /golib [soni] — g'olib(lar)ni tanlaydi. Avval har bir nomzodning obunasi qayta tekshiriladi,
// oldingi g'oliblar qayta tanlanmaydi (shuning uchun /golib ni qayta yuborish = qayta tanlash).
async function handleDraw(m) {
  if (!(await isBotAdmin(m.from))) {
    await tgCall('sendMessage', { chat_id: m.chat.id, text: "Bu buyruq faqat adminlar uchun." });
    return;
  }
  const arg = Number(m.text.replace(/^\/golib(@\w+)?/i, '').trim());
  const count = Number.isInteger(arg) && arg >= 1 ? Math.min(arg, MAX_WINNERS) : 1;

  const won = new Set((await listWinners()).map((w) => w.tgId));
  const candidates = (await listEntries()).filter((e) => e.steamid && !won.has(e.tgId));
  const valid = [];
  for (const e of shuffle(candidates)) {
    let sub = e.subscribed;
    try {
      sub = await isSubscribed(e.tgId);
      if (sub !== e.subscribed) await setSubscribed(e.tgId, sub);
    } catch {
      // tekshirib bo'lmasa — oxirgi ma'lum holat
    }
    if (sub) valid.push(e);
    if (valid.length >= count) break;
  }
  if (!valid.length) {
    await tgCall('sendMessage', { chat_id: m.chat.id, text: "Ikkala shartni bajargan (va hali yutmagan) ishtirokchi yo'q." });
    return;
  }

  const lines = [];
  for (const [i, w] of valid.entries()) {
    await recordWinner({ tgId: w.tgId, steamid: w.steamid, note: `${valid.length}/${count} g'olib` });
    const label = w.tgUsername ? `@${w.tgUsername}` : esc(w.tgName || w.tgId);
    lines.push(`${i + 1}. <a href="tg://user?id=${w.tgId}">${label}</a>`);
    tgCall('sendMessage', { chat_id: w.tgId, text: "🎉 Tabriklaymiz! Siz OXY SAVDO rozigrishida g'olib bo'ldingiz. Admin siz bilan bog'lanadi." }).catch(() => {});
  }
  const announce = `🏆 Rozigrish g'oliblari:\n${lines.join('\n')}\n\nTabriklaymiz! 🎉`;
  await tgCall('sendMessage', { chat_id: channelId(), text: announce, parse_mode: 'HTML' }).catch((e) =>
    console.error('[giveaway] g\'olib e\'lon qilinmadi:', e.message)
  );
  const detail = valid.map((w, i) => `${i + 1}. ${w.tgUsername ? '@' + w.tgUsername : w.tgName || w.tgId} — Steam: ${w.steamName || '—'} (https://steamcommunity.com/profiles/${w.steamid})`);
  await tgCall('sendMessage', {
    chat_id: m.chat.id,
    text: `✅ ${valid.length} ta g'olib tanlandi va kanalga e'lon qilindi:\n${detail.join('\n')}${valid.length < count ? `\n\n(so'ralgan ${count} ta, nomzod yetmadi)` : ''}`,
    disable_web_page_preview: true,
  });
}

// /reset ha — hamma ishtirokchilarni o'chiradi (tasdiqlash so'zi bilan)
async function handleReset(m) {
  if (!(await isBotAdmin(m.from))) {
    await tgCall('sendMessage', { chat_id: m.chat.id, text: "Bu buyruq faqat adminlar uchun." });
    return;
  }
  if (m.text.replace(/^\/reset(@\w+)?/i, '').trim().toLowerCase() !== 'ha') {
    await tgCall('sendMessage', { chat_id: m.chat.id, text: "Hamma ishtirokchilar (Steam bog'lanishlari bilan) o'chiriladi.\nTasdiqlash: /reset ha" });
    return;
  }
  const n = await resetEntries();
  await tgCall('sendMessage', { chat_id: m.chat.id, text: `✅ ${n} ta ishtirokchi o'chirildi. Hisob 0.` });
}

// Kanaldagi "Qatnashish" tugmasi bosildi
async function handleJoin(q) {
  const { entry, subError } = await refreshEntry(q.from);
  let text;
  if (subError) text = "Obunani tekshirib bo'lmadi. Keyinroq urinib ko'ring.";
  else if (isEligible(entry)) text = "✅ Siz rozigrishda ishtirok etyapsiz! Omad!";
  else {
    const miss = [];
    if (!entry.subscribed) miss.push("kanalga obuna");
    if (!entry.steamid) miss.push("saytda Steam bilan kirish");
    text = `❌ Yetishmayapti: ${miss.join(' va ')}.\n"Shartlarni tekshirish" tugmasini bosing.`;
  }
  await tgCall('answerCallbackQuery', { callback_query_id: q.id, text, show_alert: true }).catch(() => {});
  if (q.message?.chat?.id && q.message?.message_id) {
    // tugmadagi sonni yangilaymiz (o'zgarmagan bo'lsa Telegram xato qaytaradi — e'tiborsiz)
    tgCall('editMessageReplyMarkup', {
      chat_id: q.message.chat.id,
      message_id: q.message.message_id,
      reply_markup: await postKeyboard(),
    }).catch(() => {});
  }
}

// Mini App: foydalanuvchi holati. Shartlar bajarilgan bo'lsa ishtirokchi hisoblanadi; kanaldagi tugma soni yangilanadi.
export async function joinStatus(user, msgId = null) {
  const { entry, subError } = await refreshEntry(user);
  const out = {
    subscribed: Boolean(entry.subscribed),
    steam: Boolean(entry.steamid),
    steamName: entry.steamName || null,
    eligible: isEligible(entry),
    checkFailed: Boolean(subError),
    channelLink: channelLink(),
    channelLabel: channelLabel(),
    // Steam'ga Mini App ichida kiriladi; qaytgach /rozigrish/app?t=... tokeni bilan Telegram akkauntga bog'lanadi
    steamUrl: entry.steamid
      ? null
      : `${SITE}/api/auth/steam/login?next=${encodeURIComponent(`/rozigrish/app?t=${makeLinkToken(user.id, user.username)}`)}`,
  };
  out.count = await eligibleCount();
  if (msgId) {
    tgCall('editMessageReplyMarkup', { chat_id: channelId(), message_id: msgId, reply_markup: await postKeyboard(msgId) }).catch(() => {});
  }
  return out;
}

// Webhook yangilanishi
export async function handleGiveawayUpdate(update) {
  if (update?.message) {
    const m = update.message;
    if (m.chat?.type !== 'private' || !m.from) return { skip: 'not_private' };
    // Kanal postini botga forward qilsa — kanalning raqamli ID'sini qaytaradi (yopiq kanal sozlash uchun)
    if (/^\/golib(@\w+)?(\s|$)/i.test(m.text || '')) {
      await handleDraw(m);
      return { ok: true };
    }
    if (/^\/reset(@\w+)?(\s|$)/i.test(m.text || '')) {
      await handleReset(m);
      return { ok: true };
    }
    if (/^\/yangi(@\w+)?(\s|$)/i.test(m.text || m.caption || '')) {
      await handleNewGiveaway(m);
      return { ok: true };
    }
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
    if (q.data === 'join') {
      await handleJoin(q);
      return { ok: true };
    }
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
