import { getProductById } from '@/lib/productStore';
import { getSkinById } from '@/lib/skinportFeed';
import ProductPageClient from './client';

export const dynamic = 'force-dynamic';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app'
).replace(/\/+$/, '');

function absUrl(u) {
  if (!u) return null;
  if (/^https?:\/\//.test(u)) return u;
  return `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}

function clip(s, n = 160) {
  const t = String(s || '').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

export async function generateMetadata({ params }) {
  const id = params.id;
  const canonical = `/mahsulot/${id}`;

  let product = null;
  try {
    product = await getProductById(id);
  } catch {
    /* pastda skin sifatida sinab ko'ramiz */
  }
  if (product) {
    const desc = clip(
      product.short?.uz || product.short?.ru || `${product.name} — OXY SAVDO'da sotib oling.`
    );
    return {
      title: product.name,
      description: desc,
      alternates: { canonical },
      openGraph: {
        type: 'website',
        url: canonical,
        title: product.name,
        description: desc,
        images: product.image ? [absUrl(product.image)] : undefined,
      },
    };
  }

  let skin = null;
  try {
    skin = await getSkinById(id);
  } catch {
    /* topilmadi */
  }
  if (skin) {
    const title = skin.name + (skin.wear ? ` (${skin.wear})` : '');
    const price = skin.price ? `${Number(skin.price).toLocaleString('ru-RU')} so'm` : null;
    const desc = clip(
      `${skin.name} CS2 skinini OXY SAVDO'da sotib oling.` +
        (price ? ` Narx: ${price}.` : '') +
        " UZS'da to'lov (Payme, Click), avtomatik yetkazish."
    );
    return {
      title,
      description: desc,
      alternates: { canonical },
      openGraph: { type: 'website', url: canonical, title, description: desc },
    };
  }

  return { title: 'Mahsulot', alternates: { canonical } };
}

export default function Page({ params }) {
  return <ProductPageClient params={params} />;
}
