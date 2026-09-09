import { categories } from '@/lib/products';
import CatalogPageClient from './client';

export function generateMetadata({ params }) {
  const { slug } = params;

  if (slug === 'skins') {
    return { title: 'CS2 skinlar', alternates: { canonical: '/' } };
  }

  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: 'Katalog' };

  const name = cat.uz || slug;
  const desc = `${name} — OXY SAVDO katalogi. O'zbekiston bo'ylab yetkazib berish, UZS'da to'lov.`;
  return {
    title: name,
    description: desc,
    alternates: { canonical: `/katalog/${slug}` },
    openGraph: { type: 'website', url: `/katalog/${slug}`, title: name, description: desc },
  };
}

export default function Page({ params }) {
  return <CatalogPageClient params={params} />;
}
