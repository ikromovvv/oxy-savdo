'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import ProductCard from '@/components/ProductCard';
import Gallery from '@/components/Gallery';
import Reveal from '@/components/Reveal';
import { getProduct, products, formatPrice } from '@/lib/products';

export default function ProductPage({ params }) {
  const { t, lang, add, setCartOpen } = useStore();
  const [qty, setQty] = useState(1);
  const product = getProduct(params.id);
  if (!product) notFound();

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <>
      <section className="container-site py-10">
        <Link href={`/katalog/${product.category}`} className="text-sm text-muted hover:text-white">
          ← {t('all_products')}
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Gallery o'zining spiral animatsiyasiga ega — Reveal bilan o'ralmaydi
              (transform 'fixed' qatlamni buzadi) */}
          <Gallery product={product} />

          <Reveal stagger className="flex flex-col gap-5">
            {product.badge ? (
              <span className="w-fit rounded-full border border-line px-3 py-1 text-[10px] uppercase tracking-wider text-muted">
                {product.badge[lang]}
              </span>
            ) : (
              <span className="hidden" />
            )}
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="text-muted">{product.short[lang]}</p>

            <div className="card p-5">
              <div className="label">{t('specs')}</div>
              <dl className="mt-4 divide-y divide-line">
                {product.specs.map((s) => (
                  <div key={s.v} className="flex justify-between py-2.5 text-sm">
                    <dt className="text-muted">{s[lang]}</dt>
                    <dd>{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="text-2xl font-semibold">{formatPrice(product.price * qty)}</div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-line px-2 py-1.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-7 w-7 rounded-full hover:bg-white/10">−</button>
                <span className="w-6 text-center text-sm">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="h-7 w-7 rounded-full hover:bg-white/10">+</button>
              </div>
              <button onClick={() => add(product, qty)} className="btn-ghost">{t('add_to_cart')}</button>
              <button
                onClick={() => { add(product, qty); setCartOpen(true); }}
                className="btn-primary"
              >
                {t('buy_now')}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-site py-10">
          <Reveal as="h2" className="mb-6 text-2xl font-semibold tracking-tight">
            {t('all_products')}
          </Reveal>
          <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </Reveal>
        </section>
      )}
    </>
  );
}
