'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './StoreProvider';
import { ProductMedia } from './ProductCard';
import { weaponTypes, formatPrice } from '@/lib/products';

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path
        d="M1 1h3l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L21 6H6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Katalog/saqlangan sahifalarida ishlatiladigan bitta skin kartasi.
export default function SkinCard({ product: p }) {
  const { t, lang, add, favorites, toggleFavorite } = useStore();
  const [added, setAdded] = useState(false);

  const typeLabel = weaponTypes.find((w) => w.slug === p.weaponType)?.[lang];
  // LIS-SKINS'dan haqiqiy miqdor kelsa shuni, bo'lmasa taxminiyni ko'rsatamiz
  const stock = Number.isFinite(p.count) && p.count > 0 ? p.count : 1 + ((p.id.length + p.id.charCodeAt(0)) % 4);

  function onAdd() {
    add(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="group card relative flex flex-col overflow-hidden p-3 transition-colors hover:border-white/25">
      <span className="absolute left-3 top-3 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-sky-400">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <button
        onClick={() => toggleFavorite(p)}
        className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm transition hover:bg-black/80"
        aria-label="favorite"
      >
        <span className={favorites.some((f) => f.id === p.id) ? 'text-accent' : 'text-white/60'}>
          {favorites.some((f) => f.id === p.id) ? '♥' : '♡'}
        </span>
      </button>

      <Link href={`/mahsulot/${p.id}`} className="block">
        <ProductMedia product={p} className="aspect-square rounded-xl" />
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <Link href={`/mahsulot/${p.id}`} className="block">
          {(typeLabel || p.wear) && (
            <div className="truncate text-[11px] text-muted">
              {typeLabel}
              {typeLabel && p.wear ? ' · ' : ''}
              {p.wear}
            </div>
          )}
          <div className="mt-0.5 truncate text-sm font-medium transition-colors hover:text-accent">{p.name}</div>
        </Link>

        {/* mobil/planshet: narx va tugma bir-birining ostida, doim ko'rinadi */}
        <div className="mt-3 flex items-center justify-between pt-1 lg:hidden">
          <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
          <span className="text-xs text-muted">×{stock}</span>
        </div>
        <button
          onClick={onAdd}
          className={`mt-2 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold lg:hidden ${
            added ? 'bg-accent text-ink' : 'bg-white text-ink'
          }`}
        >
          <CartIcon />
          {added ? t('added') : t('add_to_cart')}
        </button>

        {/* katta ekran: narx qatori, hover'da xarid tugmasi bilan almashadi */}
        <div className="relative mt-3 hidden min-h-[34px] pt-1 lg:block">
          <div className="flex items-center justify-between transition-opacity duration-200 group-hover:opacity-0">
            <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
            <span className="text-xs text-muted">×{stock}</span>
          </div>

          <button
            onClick={onAdd}
            className={`absolute inset-x-0 bottom-0 flex translate-y-1.5 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 ${
              added ? 'bg-accent text-ink' : 'bg-white text-ink'
            }`}
          >
            <CartIcon />
            {added ? t('added') : t('add_to_cart')}
          </button>
        </div>
      </div>
    </div>
  );
}
