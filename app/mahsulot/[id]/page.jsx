import { getProductById } from '@/lib/productStore';
import { getSkinById } from '@/lib/skinportFeed';
import { getSkinMeta } from '@/lib/skinImages';
import ProductPageClient from './client';
import { productLd, breadcrumbLd } from '@/lib/seo';

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
    let image = skin.image;
    if (!image) {
      try {
        image = (await getSkinMeta([skin.name]))[skin.name]?.image;
      } catch {
        /* rasmsiz ham ishlaydi */
      }
    }
    return {
      title,
      description: desc,
      alternates: { canonical },
      openGraph: { type: 'website', url: canonical, title, description: desc, images: image ? [absUrl(image)] : undefined },
    };
  }

  return { title: 'Mahsulot', alternates: { canonical } };
}

async function loadLd(id) {
  const url = `/mahsulot/${id}`;
  try {
    const product = await getProductById(id);
    if (product) {
      return [
        productLd({
          id,
          url,
          name: product.name,
          description: product.short?.uz || product.short?.ru,
          image: product.image,
          priceUzs: product.price,
          category: 'Gaming',
        }),
        breadcrumbLd([{ name: 'Bosh sahifa', url: '/' }, { name: product.name, url }]),
      ];
    }
  } catch {
    /* skin sifatida sinaymiz */
  }
  try {
    const skin = await getSkinById(id);
    if (skin) {
      const name = skin.name + (skin.wear ? ` (${skin.wear})` : '');
      let image = skin.image;
      if (!image) {
        try {
          image = (await getSkinMeta([skin.name]))[skin.name]?.image;
        } catch {
          /* rasmsiz ham ishlaydi */
        }
      }
      return [
        productLd({
          id,
          url,
          name,
          description: `${name} — CS2 skini. UZS'da to'lov, Steam trade orqali avtomatik yetkazish.`,
          image,
          priceUzs: skin.price,
          category: 'CS2 skin',
        }),
        breadcrumbLd([{ name: 'Bosh sahifa', url: '/' }, { name: 'CS2 skinlar', url: '/skinlar' }, { name, url }]),
      ];
    }
  } catch {
    /* topilmadi */
  }
  return null;
}

export default async function Page({ params }) {
  const ld = await loadLd(params.id);
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <ProductPageClient params={params} />
    </>
  );
}
