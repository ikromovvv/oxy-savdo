'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './StoreProvider';
import { ProductMedia } from './ProductCard';
import { ShoppingCart, Heart, Check } from './icons';
import { weaponTypes } from '@/lib/products';
import { wearInfo, rarityInfo, unlockLabel } from '@/lib/skinMeta';

const usd = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');

// Katalog kartasi (Skinbor uslubida): rasm "podium" ustida, tepada holati va soni, pastda narx va savat tugmasi,
// pastki chiziq — rariteti rangida.
export default function CatalogCard({ product: p }) {
  const { t, lang, add, favorites, toggleFavorite } = useStore();
  const [added, setAdded] = useState(false);

  const rarity = rarityInfo(p);
  const fav = favorites.some((f) => f.id === p.id);
  const lockText = p.availableAfter ? unlockLabel(p.availableAfter, lang) : null;
  const locked = Boolean(lockText);
  const wearKey = wearInfo(p.wear)?.key || null;

  const parts = String(p.name || '').split(' | ');
  const weapon = parts.length > 1 ? parts[0] : weaponTypes.find((w) => w.slug === p.weaponType)?.[lang] || '';
  const skinName = parts.length > 1 ? parts.slice(1).join(' | ') : p.name;
  const count = Number.isFinite(p.count) && p.count > 0 ? p.count : null;

  function onAdd(e) {
    e.preventDefault();
    if (locked) return;
    add(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* yuqori qator: holati / StatTrak / soni */}
      <div className="flex items-center justify-between px-4 pt-3 text-xs">
        <span className="font-semibold text-white/60">
          {wearKey || ''}
          {p.phase ? <span className="ml-1.5 font-normal">{p.phase}</span> : null}
        </span>
        <span className="flex items-center gap-2">
          {p.stattrak && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">ST</span>}
          {p.souvenir && <span className="rounded bg-yellow-400/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">SV</span>}
          {count && <span className="text-white/55">x{count}</span>}
        </span>
      </div>

      {/* rasm + podium */}
      <Link href={`/mahsulot/${p.id}`} className="relative block px-3 pb-2 pt-1">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1/2 h-10 w-[74%] -translate-x-1/2 rounded-[50%] border-t"
            style={{
              background: 'radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.12), rgba(0,0,0,0.6) 72%)',
              borderColor: `${rarity.color}b0`,
              boxShadow: `0 -3px 16px ${rarity.color}45`,
            }}
          />
          <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className="relative aspect-[4/3]" />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(p);
          }}
          aria-label="favorite"
          className="absolute bottom-3 left-3 z-20 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/45 backdrop-blur transition hover:bg-black/70"
        >
          <Heart className={`h-4 w-4 ${fav ? 'fill-current text-accent' : 'text-white/70'}`} />
        </button>
      </Link>

      {/* tana */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-1">
        <div className="truncate text-xs text-white/55">{weapon}</div>
        <Link href={`/mahsulot/${p.id}`} className="mt-0.5 line-clamp-1 text-lg font-semibold leading-tight transition hover:text-accent">
          {skinName}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-xl font-bold leading-tight tracking-tight">
              {Number(p.price).toLocaleString('ru-RU')} <span className="text-sm font-normal text-white/55">so&apos;m</span>
            </div>
            {p.priceUsd != null && <div className="mt-0.5 text-xs text-white/45">≈ {usd(p.priceUsd)}</div>}
            {locked && <div className="mt-1 text-[11px] text-amber-300">{t('btn_locked')} · {lockText}</div>}
          </div>
          <button
            onClick={onAdd}
            disabled={locked}
            aria-label={t('add_to_cart')}
            title={added ? t('added') : t('add_to_cart')}
            className={`grid h-11 w-11 flex-none place-items-center rounded-xl border transition ${
              locked
                ? 'cursor-not-allowed border-line text-white/30'
                : added
                  ? 'border-accent bg-accent text-ink'
                  : 'border-white/15 bg-white/[0.04] text-white/85 hover:border-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            {added ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <ShoppingCart className="h-5 w-5" strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {/* pastki chiziq — rariteti */}
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: rarity.color, boxShadow: `0 0 10px ${rarity.color}80` }} aria-hidden="true" />
    </div>
  );
}
