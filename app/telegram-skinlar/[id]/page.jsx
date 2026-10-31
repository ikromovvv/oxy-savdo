import { notFound } from 'next/navigation';
import TgSkinDetail from '@/components/TgSkinDetail';
import { getListings } from '@/lib/tgListings';

export const revalidate = 60;

async function findItem(id) {
  const msgId = String(id || '').replace(/\D/g, '');
  if (!msgId) return null;
  const { items, channel } = await getListings();
  return items.find((x) => x.id === `${channel}/${msgId}`) || null;
}

export async function generateMetadata({ params }) {
  const p = await findItem(params.id).catch(() => null);
  if (!p) return { title: 'Skin topilmadi' };
  const title = `${p.name}${p.qualityName ? ` (${p.qualityName})` : ''}`;
  return {
    title,
    description: `${title}${p.float != null ? `, float ${p.float}` : ''}${p.priceUzs ? ` — ${p.priceUzs.toLocaleString('ru-RU')} so'm` : ''}. OXY SAVDO Telegram skinlari.`,
    alternates: { canonical: `/telegram-skinlar/${params.id}` },
  };
}

export default async function TgSkinPage({ params }) {
  const item = await findItem(params.id).catch(() => null);
  if (!item) notFound();
  return <TgSkinDetail item={item} />;
}
