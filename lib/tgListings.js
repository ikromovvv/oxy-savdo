// Telegram e'lonlarini saytda ko'rsatish uchun tayyor shaklga keltiradi:
// takrorlarni olib tashlaydi, narxni (USD -> so'm), rasm manzilini, rariteti rangini
// (CSGO-API orqali) va Telegram admin bilan yozishuv havolasini qo'shadi.

import { listPosts } from './tgStore';
import { ensureFresh, TG_CHANNEL } from './tgSync';
import { dedupeKey, WEAR_FULL } from './tgParse';
import { getSkinMeta } from './skinImages';

const USD_UZS = Number(process.env.USD_UZS) || 12700;
const SOLD_KEEP_MS = 14 * 24 * 60 * 60 * 1000; // sotilganlar 2 hafta ko'rinadi

// CSGO-API nomi: "★ StatTrak™ Karambit | Fade (Factory New)". Bizning nomda ★ boshida bo'lishi mumkin.
export function marketName(r) {
  const star = /^★/.test(r.name);
  const base = r.name.replace(/^★\s*/, '');
  const wear = WEAR_FULL[r.quality] ? ` (${WEAR_FULL[r.quality]})` : '';
  return `${star ? '★ ' : ''}${r.stattrak ? 'StatTrak™ ' : ''}${base}${wear}`;
}

export function toPublic(r, meta) {
  const m = meta || {};
  const link = `https://t.me/${r.channel}/${r.msgId}`;
  const priceUzs =
    r.priceUzs != null ? r.priceUzs : r.priceUsd != null ? Math.round(r.priceUsd * USD_UZS) : null;
  const title = `${r.stattrak ? 'StatTrak™ ' : ''}${r.name}`;
  const text =
    `Salom! ${title}` +
    (r.quality ? ` (${r.quality})` : '') +
    (r.float != null ? `, float ${r.float}` : '') +
    ` skinini sotib olmoqchiman. ${link}`;
  return {
    id: r.id,
    name: r.name,
    stattrak: r.stattrak,
    souvenir: r.souvenir,
    quality: r.quality,
    qualityName: WEAR_FULL[r.quality] || null,
    float: r.float,
    priceUzs,
    priceUsd: r.priceUsd,
    priceUsdShown: r.priceUsd != null ? r.priceUsd : priceUzs != null ? Math.round(priceUzs / USD_UZS) : null,
    usdApprox: r.priceUsd == null && priceUzs != null,
    status: r.status,
    unban: r.unban,
    noBan: r.noBan,
    contact: r.contact,
    image: r.imageUrl || (r.fileId ? `/api/tg-img/${encodeURIComponent(r.fileId)}` : m.image || null),
    postedAt: r.postedAt,
    // kanal rasmi (telesco.pe havolasi) muddati o'tib 404 bersa — CS2 skin rasmiga o'tamiz
    fallbackImage: m.image || null,
    rarity: m.rarity || null,
    rarityColor: m.rarityColor || null,
    minFloat: m.minFloat ?? null,
    maxFloat: m.maxFloat ?? null,
    link,
    buyUrl: r.contact ? `https://t.me/${r.contact.replace(/^@/, '')}?text=${encodeURIComponent(text)}` : link,
  };
}

export async function getListings() {
  await ensureFresh().catch(() => {});
  const rows = await listPosts({ statuses: ['available', 'sold'], limit: 400 }); // yangisi birinchi

  // bir xil skin qayta joylangan bo'lsa — eng yangisi
  const seen = new Map();
  for (const r of rows) {
    const k = dedupeKey(r);
    if (!seen.has(k)) seen.set(k, r);
  }
  const now = Date.now();
  const kept = [...seen.values()].filter((r) => r.status !== 'sold' || now - r.postedAt < SOLD_KEEP_MS);

  let meta = {};
  try {
    meta = await getSkinMeta([...new Set(kept.map((r) => r.name))]);
  } catch {
    /* rarity topilmasa ham ro'yxat ishlayveradi */
  }

  const items = kept.map((r) => toPublic(r, meta[r.name]));
  // mavjudlari yuqorida, sotilganlar pastda
  items.sort((a, b) => (a.status === b.status ? b.postedAt - a.postedAt : a.status === 'available' ? -1 : 1));
  return { items, channel: TG_CHANNEL, link: `https://t.me/${TG_CHANNEL}` };
}
