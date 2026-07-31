'use client';

import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import { useStore } from '@/components/StoreProvider';
import { byCategory, categories } from '@/lib/products';

export default function CatalogPage({ params }) {
  const { lang } = useStore();
  const cat = categories.find((c) => c.slug === params.slug);
  if (!cat) notFound();
  const items = byCategory(params.slug);

  return (
    <section className="container-site py-14">
      <Reveal>
        <span className="label">OXY / {cat.slug}</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{cat[lang]}</h1>
      </Reveal>

      <Reveal stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </Reveal>
    </section>
  );
}
