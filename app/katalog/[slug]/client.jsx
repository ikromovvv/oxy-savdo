'use client';

import { notFound, redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import { useStore } from '@/components/StoreProvider';
import { categories } from '@/lib/products';

export default function CatalogPage({ params }) {
  const { lang } = useStore();

  // Skinlar endi alohida katalog sahifasida emas — Steam orqali kirgach,
  // bosh sahifaning o'zi skinlar katalogiga aylanadi
  if (params.slug === 'skins') {
    redirect('/');
  }

  const cat = categories.find((c) => c.slug === params.slug);
  if (!cat) notFound();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    fetch(`/api/products?category=${params.slug}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('http');
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        if (d.error) throw new Error(d.error);
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params.slug, reloadKey]);

  return (
    <section className="container-site py-14">
      <Reveal>
        <span className="label">OXY / {cat.slug}</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{cat[lang]}</h1>
      </Reveal>

      {loading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card aspect-[4/3] animate-pulse bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="card mt-10 p-10 text-center">
          <p className="text-sm text-muted">Mahsulotlarni yuklab bo&apos;lmadi.</p>
          <button onClick={() => setReloadKey((k) => k + 1)} className="btn-ghost mt-4 inline-flex">
            Qayta urinish
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-10 p-10 text-center text-sm text-muted">
          Bu bo&apos;limda hozircha mahsulot yo&apos;q.
        </div>
      ) : (
        <Reveal stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </Reveal>
      )}
    </section>
  );
}
