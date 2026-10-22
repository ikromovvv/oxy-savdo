// Telegram bot webhook (channel_post / edited_channel_post) -> e'lon.
//
// Bot kanalga ADMIN sifatida qo'shilgan bo'lishi kerak. Webhook:
//   https://api.telegram.org/bot<TOKEN>/setWebhook
//     ?url=https://<domen>/api/telegram/webhook
//     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
//     &allowed_updates=["channel_post","edited_channel_post"]

import { parsePost } from './tgParse';
import { upsertPosts } from './tgStore';
import { TG_CHANNEL } from './tgSync';

export async function ingestUpdate(update) {
  const msg = update?.channel_post || update?.edited_channel_post;
  if (!msg) return { skip: 'not_channel_post' };

  const uname = String(msg.chat?.username || '').toLowerCase();
  if (uname !== TG_CHANNEL) return { skip: 'other_chat' };

  const text = msg.caption ?? msg.text ?? '';
  const parsed = parsePost(text);
  if (!parsed) return { skip: 'not_a_skin_post' };

  // eng katta o'lchamdagi rasm
  const photo = Array.isArray(msg.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : null;

  await upsertPosts([
    {
      id: `${uname}/${msg.message_id}`,
      channel: uname,
      msgId: msg.message_id,
      postedAt: (msg.date ? msg.date * 1000 : Date.now()),
      rawText: text,
      ...parsed,
      imageUrl: null,
      fileId: photo?.file_id || null,
      source: 'webhook',
    },
  ]);
  return { ok: true, id: `${uname}/${msg.message_id}`, status: parsed.status };
}
