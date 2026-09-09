import { listProducts } from '@/lib/productStore';
import { queryCatalog } from '@/lib/skinportFeed';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app'
).replace(/\/+$/, '');

export const revalidate = 3600; // 1 soat

export default async function sitemap() {
  const now = new Date();

  const staticRoutes = ['', '/sotish', '/katalog/kovriklar', '/katalog/aksessuar', '/parvarish', '/yordam'].map(
    (p) => ({
      url: `${SITE_URL}${p || '/'}`,
      lastModified: now,
      changeFrequency: p === '' ? 'daily' : 'weekly',
      priority: p === '' ? 1 : 0.6,
    })
  );

  let products = [];
  try {
    products = await listProducts('all');
  } catch {
    /* bo'sh */
  }
  const productRoutes = products.map((p) => ({
    url: `${SITE_URL}/mahsulot/${p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // eng qimmat ~500 skin (Skinport keshidan)
  let skinRoutes = [];
  try {
    const { items } = await queryCatalog({ limit: 120, offset: 0, sort: 'price_desc' });
    const all = [];
    for (let off = 0; off < 500; off += 120) {
      const page = await queryCatalog({ limit: 120, offset: off, sort: 'price_desc' });
      if (!page.items?.length) break;
      all.push(...page.items);
    }
    skinRoutes = (all.length ? all : items).map((s) => ({
      url: `${SITE_URL}/mahsulot/${s.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    }));
  } catch {
    /* skinlar bo'lmasa ham sitemap ishlayveradi */
  }

  return [...staticRoutes, ...productRoutes, ...skinRoutes];
}
