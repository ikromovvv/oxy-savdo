// Telegram kanalning OCHIQ sahifasidan (https://t.me/s/<kanal>) e'lonlarni o'qish.
// Bot / token kerak emas. Webhook (lib/tgIngest.js) bilan bir xil jadvalga yozadi —
// webhook real vaqtda, bu esa boshlang'ich yuklash va zaxira uchun.

import { parsePost } from './tgParse';
import { upsertPosts, markMissing, getLastSync, touchSync, listPosts } from './tgStore';

export const TG_CHANNEL = String(process.env.TG_CHANNEL || 'oxyskinshop')
  .replace(/^.*t\.me\/(s\/)?/i, '')
  .replace(/^@/, '')
  .replace(/[/?#].*$/, '')
  .toLowerCase();

const SYNC_TTL = 10 * 60 * 1000; // 10 daqiqa

function decode(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

function htmlToText(h) {
  return decode(String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
}

// t.me/s/<kanal> HTML -> { rows (skin e'lonlari), ids (ko'rinib turgan barcha xabar id'lari) }
export function parseChannelHtml(html, channel = TG_CHANNEL) {
  const blocks = String(html).split(/(?=<div class="tgme_widget_message_wrap)/).slice(1);
  const rows = [];
  const ids = [];
  for (const b of blocks) {
    const post = b.match(/data-post="([^"\/]+)\/(\d+)"/);
    if (!post) continue;
    const msgId = Number(post[2]);
    ids.push(msgId);

    const textM = b.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
    if (!textM) continue;
    const text = htmlToText(textM[1]);
    const parsed = parsePost(text);
    if (!parsed) continue;

    const dt = b.match(/<time[^>]*datetime="([^"]+)"/);
    const img = b.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
    rows.push({
      id: `${channel}/${msgId}`,
      channel,
      msgId,
      postedAt: dt ? Date.parse(dt[1]) || Date.now() : Date.now(),
      rawText: text,
      ...parsed,
      imageUrl: img ? img[1] : null,
      fileId: null,
      source: 'scrape',
    });
  }
  return { rows, ids };
}

let inflight = null;

// Kanalni o'qib, bazaga yozadi.
export async function syncChannel() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`https://t.me/s/${TG_CHANNEL}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OXYbot/1.0)', 'Accept-Language': 'en' },
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const html = await res.text();
      const { rows, ids } = parseChannelHtml(html);
      if (ids.length === 0) return { ok: false, error: 'kanal topilmadi yoki yopiq' };

      await upsertPosts(rows);
      const deleted = await markMissing(TG_CHANNEL, Math.min(...ids), Math.max(...ids), ids);
      await touchSync();
      return { ok: true, found: rows.length, visible: ids.length, deleted };
    } catch (e) {
      return { ok: false, error: e?.message || 'sync_failed' };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// O'qishdan oldin: ma'lumot eskirgan bo'lsa yangilaydi. Baza bo'sh bo'lsa kutadi,
// aks holda orqa fonda yangilab, mavjudini darhol qaytaradi.
export async function ensureFresh() {
  const last = await getLastSync().catch(() => 0);
  if (Date.now() - last < SYNC_TTL) return { fresh: true };
  const have = await listPosts({ limit: 1 }).catch(() => []);
  if (have.length === 0) return { fresh: false, ...(await syncChannel()) };
  syncChannel().catch(() => {});
  return { fresh: false, background: true };
}
