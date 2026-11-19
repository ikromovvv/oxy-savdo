'use client';

import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';
import { WearBar } from './SkinCard';
import { Eye, Zap, ShoppingCart } from './icons';
import { formatPrice } from '@/lib/products';

// Mahsulot sahifasida: shu skinning HOZIR sotib olsa bo'ladigan alohida nusxalari (LIS-SKINS).
// Har nusxada: aniq float, naqsh, stikerlar, "O'yin ichida ko'rish" (CS2 inspect), tezkor yetkazish belgisi.
// Savatga aynan shu nusxa qo'shiladi (listingId) — arzonrog'i emas, shu nusxaning o'zi sotib olinadi.
export default function SkinListings({ product }) {
  const { t, add, setCartOpen } = useStore();
  const [state, setState] = useState({ loading: true, listings: [], supported: true, error: false });
  const [justAdded, setJustAdded] = useState(null);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, listings: [], supported: true, error: false });
    fetch(`/api/skins/${product.id}/listings`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, listings: d.listings || [], supported: d.supported !== false, error: Boolean(d.error) }))
      .catch(() => alive && setState({ loading: false, listings: [], supported: true, error: true }));
    return () => {
      alive = false;
    };
  }, [product.id]);

  if (!state.supported) return null;
  if (!state.loading && !state.listings.length && !state.error) return null;

  const toProduct = (l) => ({
    id: `lis-${l.id}`,
    name: product.name,
    fullName: product.fullName,
    price: l.price,
    priceUsd: l.priceUsd,
    image: product.image,
    wear: product.wear,
    weaponType: product.weaponType,
    category: 'skins',
    listingId: String(l.id),
    lisId: l.id,
    floatValue: l.floatValue,
  });

  const addListing = (l, openCart) => {
    add(toProduct(l));
    setJustAdded(l.id);
    setTimeout(() => setJustAdded((v) => (v === l.id ? null : v)), 1200);
    if (openCart) setCartOpen(true);
  };

  return (
    <section className="container-site py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('skin_listings_title')}</h2>
        <p className="text-xs text-muted">{t('skin_listings_hint')}</p>
      </div>

      {state.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-white/[0.04]" />)}
        </div>
      ) : state.error ? (
        <div className="card p-5 text-sm text-muted">{t('skin_listings_error')}</div>
      ) : (
        <ul className="space-y-3">
          {state.listings.map((l) => (
            <li
              key={l.id}
              className="card grid items-center gap-x-5 gap-y-3 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]"
            >
              {/* float + holat chizig'i */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{t('skin_float')}</span>
                  <span className="font-mono text-white/90">{l.floatValue != null ? l.floatValue.toFixed(6) : '—'}</span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      l.instant ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                    }`}
                  >
                    {l.instant ? <><Zap className="h-3 w-3" strokeWidth={2.5} />{t('skin_instant')}</> : t('skin_slow')}
                  </span>
                </div>
                {product.wear && l.floatValue != null && (
                  <WearBar wear={product.wear} minFloat={product.minFloat} maxFloat={product.maxFloat} value={l.floatValue} />
                )}
              </div>

              {/* naqsh + stikerlar */}
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted">
                {l.paintSeed != null && (
                  <span className="rounded-md border border-line px-2 py-1">
                    {t('skin_pattern')}: <span className="font-mono text-white/85">#{l.paintSeed}</span>
                  </span>
                )}
                {l.stickers.map((s, i) =>
                  s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={s.image} alt={s.name} title={s.name} loading="lazy" className="h-7 w-9 rounded object-contain" />
                  ) : null
                )}
              </div>

              {/* narx */}
              <div className="sm:text-right">
                <div className="text-lg font-bold leading-tight">{formatPrice(l.price)}</div>
                <div className="text-[11px] text-muted">${Number(l.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {/* amallar */}
              <div className="flex flex-wrap items-center gap-2 sm:col-span-3 lg:col-span-1 lg:justify-end">
                {l.inspectLink && (
                  <a
                    href={l.inspectLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold transition hover:border-white/40 hover:bg-white/10"
                    title={t('skin_inspect_game_hint')}
                  >
                    <Eye className="h-4 w-4" strokeWidth={2} />
                    {t('skin_inspect_game')}
                  </a>
                )}
                <button
                  onClick={() => addListing(l, false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold transition hover:border-white/40"
                >
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                  {justAdded === l.id ? t('added') : t('add_to_cart')}
                </button>
                <button onClick={() => addListing(l, true)} className="btn-primary !px-4 !py-2 text-xs">
                  {t('buy_now')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
