'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import ProductCard from '@/components/ProductCard';
import SkinCard from '@/components/SkinCard';
import Gallery from '@/components/Gallery';
import Reveal from '@/components/Reveal';
import SteamLoginGate from '@/components/SteamLoginGate';
import { getProduct, products, formatPrice, weaponTypes } from '@/lib/products';

// Kovrik/aksessuar bo'lsa statik ro'yxatdan, skin bo'lsa (statik ro'yxatda
// yo'q — LIS-SKINS'dan real vaqtda) /api/skins/[id] orqali olamiz.
export default function ProductPage({ params }) {
  const { t, lang, add, setCartOpen, user, userLoading } = useStore();
  const [qty, setQty] = useState(1);

  const staticProduct = getProduct(params.id);
  const [product, setProduct] = useState(staticProduct || null);
  const [related, setRelated] = useState(
    staticProduct ? products.filter((p) => p.category === staticProduct.category && p.id !== staticProduct.id).slice(0, 3) : []
  );
  const [loading, setLoading] = useState(!staticProduct);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (staticProduct) return;
    let alive = true;
    setLoading(true);
    setFailed(false);

    fetch(`/api/skins/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.item) {
          setProduct(d.item);
          setRelated(d.related || []);
        } else {
          setFailed(true);
        }
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <section className="container-site py-10">
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="card aspect-[4/3] animate-pulse bg-white/5" />
          <div className="flex flex-col gap-3">
            <div className="h-8 w-2/3 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="h-40 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </section>
    );
  }

  if (failed || !product) notFound();

  // Skinlar faqat Steam orqali kirilganda ko'rinadi
  if (product.category === 'skins' && !userLoading && !user) {
    return <SteamLoginGate title={product.name} />;
  }

  const typeLabel = weaponTypes.find((w) => w.slug === product.weaponType)?.[lang];
  const isSkin = product.category === 'skins';

  return (
    <>
      <section className="container-site py-10">
        <Link
          href={isSkin ? '/' : `/katalog/${product.category}`}
          className="text-sm text-muted hover:text-white"
        >
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
            <p className="text-muted">
              {isSkin ? `${typeLabel || ''}${typeLabel && product.wear ? ' · ' : ''}${product.wear || ''}` : product.short?.[lang]}
            </p>

            <div className="card p-5">
              <div className="label">{t('specs')}</div>
              <dl className="mt-4 divide-y divide-line">
                {isSkin ? (
                  <>
                    <div className="flex justify-between py-2.5 text-sm">
                      <dt className="text-muted">{t('catalog_wear')}</dt>
                      <dd>{product.wear || '—'}</dd>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm">
                      <dt className="text-muted">{t('skin_stock')}</dt>
                      <dd>{Number.isFinite(product.count) ? product.count : '—'}</dd>
                    </div>
                    {product.stattrak && (
                      <div className="flex justify-between py-2.5 text-sm">
                        <dt className="text-muted">StatTrak™</dt>
                        <dd>✓</dd>
                      </div>
                    )}
                    {product.souvenir && (
                      <div className="flex justify-between py-2.5 text-sm">
                        <dt className="text-muted">Souvenir</dt>
                        <dd>✓</dd>
                      </div>
                    )}
                  </>
                ) : (
                  product.specs?.map((s) => (
                    <div key={s.v} className="flex justify-between py-2.5 text-sm">
                      <dt className="text-muted">{s[lang]}</dt>
                      <dd>{s.v}</dd>
                    </div>
                  ))
                )}
              </dl>
            </div>

            <div>
              {/* asosiy narx — bitta dona uchun, o'zgarmaydi */}
              <div className="text-2xl font-semibold">{formatPrice(product.price)}</div>
              {qty > 1 && (
                <span className="mt-1 block text-sm text-muted">
                  {qty} × {formatPrice(product.price)} ={' '}
                  <span className="text-white/90">{formatPrice(product.price * qty)}</span>
                </span>
              )}
            </div>

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
          <Reveal stagger className={isSkin ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
            {related.map((p) => (isSkin ? <SkinCard key={p.id} product={p} /> : <ProductCard key={p.id} product={p} />))}
          </Reveal>
        </section>
      )}
    </>
  );
}
