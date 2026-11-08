// cs2shop bilan bog'liq Telegram xabarlari: alohida guruhga (TELEGRAM_CS2SHOP_CHAT_ID).
// O'rnatilmagan bo'lsa — umumiy admin chatga (TELEGRAM_CHAT_ID), u ham yo'q bo'lsa — faqat log.
//
// Xabarlar: yetkazish xatosi / yuborildi / yakunlandi, REVERSED, cs2shop balansi kam.

import { kvEnabled, kvSetNx } from './kv';
import { configured, balance } from './fulfill/cs2shop';

export function cs2shopChatId() {
  return process.env.TELEGRAM_CS2SHOP_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';
}

// Yuboradi va natijani sabab bilan qaytaradi: { ok, error?, dedicated }
//   dedicated = xabar TELEGRAM_CS2SHOP_CHAT_ID guruhiga ketdimi (yoki umumiy chatga)
export async function sendCs2shop(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = cs2shopChatId();
  const dedicated = Boolean(process.env.TELEGRAM_CS2SHOP_CHAT_ID);
  if (!token) return { ok: false, dedicated, error: 'TELEGRAM_BOT_TOKEN sozlanmagan' };
  if (!chat) {
    console.log('[cs2shop]\n' + text);
    return { ok: false, dedicated, error: 'TELEGRAM_CS2SHOP_CHAT_ID / TELEGRAM_CHAT_ID sozlanmagan' };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    if (r.ok) return { ok: true, dedicated };
    const d = await r.json().catch(() => ({}));
    return { ok: false, dedicated, error: `Telegram ${r.status}: ${d.description || 'xato'}` };
  } catch (e) {
    console.error('[cs2shop] telegram xato:', e.message);
    return { ok: false, dedicated, error: `tarmoq xatosi: ${e.message}` };
  }
}

export async function notifyCs2shop(text) {
  return (await sendCs2shop(text)).ok;
}

export const lowBalanceThreshold = () => {
  const v = Number(process.env.CS2SHOP_LOW_BALANCE_USD);
  return Number.isFinite(v) && v >= 0 ? v : 20;
};

// cs2shop balansi chegaradan past bo'lsa ogohlantiradi (6 soatda bir martadan ko'p emas).
// Qaytaradi: { low: boolean, available?: number, notified?: boolean }
// { force: true } — 6 soatlik takrorlanmaslik qoidasini chetlab o'tadi (admin tugmasi uchun) va xato sababini qaytaradi.
export async function checkLowBalance({ force = false } = {}) {
  if (!configured()) return { low: false };
  const { available } = await balance();
  const limit = lowBalanceThreshold();
  if (available >= limit) return { low: false, available, limit };

  let first = true;
  if (kvEnabled && !force) {
    try {
      first = await kvSetNx('oxy:cs2shop:lowbal', '1', 6 * 3600);
    } catch {
      first = true;
    }
  }
  let notified = false;
  let error;
  if (first) {
    const r = await sendCs2shop(
      `⚠️ cs2shop balansi kam: $${available.toFixed(2)} (chegara $${limit})\n` +
        `Yangi buyurtmalar "balans yetarli emas" xatosiga tushadi.\n` +
        `To'ldirish: cs2shop.net/merchant/wallet — USDT/USDC (ERC20 yoki BEP20), minimal $5.`
    );
    notified = r.ok;
    if (!r.ok) error = r.error;
  }
  return { low: true, available, limit, notified, ...(error ? { error } : {}) };
}
