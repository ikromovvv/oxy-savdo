// cs2shop bilan bog'liq Telegram xabarlari: alohida guruhga (TELEGRAM_CS2SHOP_CHAT_ID).
// O'rnatilmagan bo'lsa — umumiy admin chatga (TELEGRAM_CHAT_ID), u ham yo'q bo'lsa — faqat log.
//
// Xabarlar: yetkazish xatosi / yuborildi / yakunlandi, REVERSED, cs2shop balansi kam.

import { kvEnabled, kvSetNx } from './kv';
import { configured, balance } from './fulfill/cs2shop';

export function cs2shopChatId() {
  return process.env.TELEGRAM_CS2SHOP_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';
}

export async function notifyCs2shop(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = cs2shopChatId();
  if (!token || !chat) {
    console.log('[cs2shop]\n' + text);
    return false;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    return r.ok;
  } catch (e) {
    console.error('[cs2shop] telegram xato:', e.message);
    return false;
  }
}

export const lowBalanceThreshold = () => {
  const v = Number(process.env.CS2SHOP_LOW_BALANCE_USD);
  return Number.isFinite(v) && v >= 0 ? v : 20;
};

// cs2shop balansi chegaradan past bo'lsa ogohlantiradi (6 soatda bir martadan ko'p emas).
// Qaytaradi: { low: boolean, available?: number, notified?: boolean }
export async function checkLowBalance() {
  if (!configured()) return { low: false };
  const { available } = await balance();
  const limit = lowBalanceThreshold();
  if (available >= limit) return { low: false, available };

  let first = true;
  if (kvEnabled) {
    try {
      first = await kvSetNx('oxy:cs2shop:lowbal', '1', 6 * 3600);
    } catch {
      first = true;
    }
  }
  let notified = false;
  if (first) {
    notified = await notifyCs2shop(
      `⚠️ cs2shop balansi kam: $${available.toFixed(2)} (chegara $${limit})\n` +
        `Yangi buyurtmalar "balans yetarli emas" xatosiga tushadi.\n` +
        `To'ldirish: cs2shop.net/merchant/wallet — USDT/USDC (ERC20 yoki BEP20), minimal $5.`
    );
  }
  return { low: true, available, notified };
}
