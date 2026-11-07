// Bot bilan shaxsiy suhbat: /start bosilganda skinlar Mini App (web app) tugmasi yuboriladi.
// Webhook'da "message" ham yoqilgan bo'lishi kerak:
//   allowed_updates=["channel_post","edited_channel_post","message"]

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');

export async function handleBotMessage(update) {
  const msg = update?.message;
  if (!msg) return { skip: 'no_message' };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { skip: 'no_bot_token' };

  // /id (yoki /chatid) — istalgan chatda shu chatning ID'sini yuboradi (guruhni ulash uchun kerak)
  if (/^\/(id|chatid)(@\w+)?(\s|$)/i.test(msg.text || '')) {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: msg.chat.id,
        text: `Chat ID: <code>${msg.chat.id}</code>`,
        parse_mode: 'HTML',
        ...(msg.message_id ? { reply_parameters: { message_id: msg.message_id, allow_sending_without_reply: true } } : {}),
      }),
    });
    return r.ok ? { ok: true, replied: 'id' } : { error: `sendMessage_${r.status}` };
  }

  if (msg.chat?.type !== 'private') return { skip: 'not_private_message' };

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
