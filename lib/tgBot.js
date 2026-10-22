// Bot bilan shaxsiy suhbat: /start bosilganda skinlar Mini App (web app) tugmasi yuboriladi.
// Webhook'da "message" ham yoqilgan bo'lishi kerak:
//   allowed_updates=["channel_post","edited_channel_post","message"]

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');

export async function handleBotMessage(update) {
  const msg = update?.message;
  if (!msg || msg.chat?.type !== 'private') return { skip: 'not_private_message' };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { skip: 'no_bot_token' };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: 'OXY SAVDO — CS2 skinlar. Kanaldagi barcha skinlarni ilova ichida ko\'ring:',
      reply_markup: {
        inline_keyboard: [[{ text: '🎮 Skinlarni ko\'rish', web_app: { url: `${SITE}/telegram-skinlar` } }]],
      },
    }),
  });
  // 200 qaytaramiz: xato bo'lsa Telegram bir xil /start'ni qayta-qayta yubormasin
  if (!res.ok) return { error: `sendMessage_${res.status}` };
  return { ok: true, replied: true };
}
