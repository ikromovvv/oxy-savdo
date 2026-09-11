'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './StoreProvider';
import { ProductMedia } from './ProductCard';
import { weaponTypes, formatPrice } from '@/lib/products';
import { wearInfo, rarityInfo, rarityRgb, WEAR_TIERS } from '@/lib/skinMeta';

// Skin holati (exterior) — segmentlangan neon progress bar + taxminiy pointer.
// minFloat/maxFloat (CSGO-API'dan) berilsa, erishib bo'lmaydigan oraliq xiralashadi.
function WearBar({ wear, minFloat, maxFloat }) {
  const w = wearInfo(wear);
  if (!w) return null;
  const lo = typeof minFloat === 'number' ? Math.max(0, Math.min(100, minFloat * 100)) : 0;
  const hi = typeof maxFloat === 'number' ? Math.max(0, Math.min(100, maxFloat * 100)) : 100;

  return (
    <div className="mt-2.5">
      <div className="relative pt-2">
        <span
          className="absolute top-0 h-0 w-0 -translate-x-1/2 border-x-[3px] border-t-[5px] border-x-transparent border-t-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          style={{ left: `${w.midPct}%` }}
        />
        <div className="relative flex h-1.5 w-full gap-[2px]">
          {WEAR_TIERS.map((tier) => {
            const active = tier.key === w.key;
            return (
              <span
                key={tier.key}
                className="h-full flex-1 rounded-[2px] transition-all duration-300"
                style={{
                  background: TIER_COLOR[tier.key],
                  opacity: active ? 1 : 0.28,
                  boxShadow: active ? `0 0 8px ${TIER_COLOR[tier.key]}` : 'none',
                }}
              />
            );
          })}
          {lo > 0 && (
            <span className="absolute inset-y-0 left-0 rounded-l-[2px] bg-ink/80" style={{ width: `${lo}%` }} />
          )}
          {hi < 100 && (
            <span
              className="absolute inset-y-0 right-0 rounded-r-[2px] bg-ink/80"
              style={{ width: `${100 - hi}%` }}
            />
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none text-muted">
        <span className="font-bold" style={{ color: TIER_COLOR[w.key] }}>{w.key}</span>
        <span>{w.name}</span>
      </div>
    </div>
  );
}

const TIER_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
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

// Katalog / saqlangan sahifalaridagi bitta skin kartasi — neon/glassmorphism.
export default function SkinCard({ product: p }) {
  const { t, lang, add, favorites, toggleFavorite } = useStore();
  const [added, setAdded] = useState(false);

  const typeLabel = weaponTypes.find((w) => w.slug === p.weaponType)?.[lang];
  const rarity = rarityInfo(p);
  const rgb = rarityRgb(rarity.color);
  const fav = favorites.some((f) => f.id === p.id);
  const stock =
    Number.isFinite(p.count) && p.count > 0
      ? p.count
      : 1 + ((p.id.length + p.id.charCodeAt(0)) % 4);

  function onAdd() {
    add(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_26px_var(--rglow)]"
      style={{
        borderColor: `rgba(${rgb}, 0.32)`,
        background: 'linear-gradient(180deg, rgba(22,28,38,0.65) 0%, rgba(18,18,20,0.55) 100%)',
        boxShadow: `0 0 16px rgba(${rgb}, 0.16), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        '--rglow': `rgba(${rgb}, 0.38)`,
      }}
    >
      {/* rariteti — yuqori neon chizig'i */}
      <span
        className="absolute inset-x-0 top-0 z-10 h-[2px]"
        style={{ background: rarity.color, boxShadow: `0 0 12px ${rarity.color}` }}
        aria-hidden="true"
      />

      {/* sevimli */}
      <button
        onClick={() => toggleFavorite(p)}
        aria-label="favorite"
        className="absolute right-2.5 top-2.5 z-20 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/45 text-base backdrop-blur-md transition hover:bg-black/70"
      >
        <span className={fav ? 'text-accent' : 'text-white/70'}>{fav ? '♥' : '♡'}</span>
      </button>

      {/* StatTrak / Souvenir */}
      {(p.stattrak || p.souvenir) && (
        <span className="absolute left-2.5 top-2.5 z-20 rounded-md border border-line bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent backdrop-blur">
          {p.stattrak ? 'StatTrak™' : 'Souvenir'}
        </span>
      )}

      {/* RASM — orqada rariteti rangida nur, katta rasm */}
      <Link
        href={`/mahsulot/${p.id}`}
        className="relative block px-4 pb-1 pt-7 transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[42%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl transition-opacity duration-300 group-hover:opacity-45"
          style={{ background: rarity.color }}
        />
        <ProductMedia product={p} className="relative aspect-[4/3] rounded-lg" />
      </Link>

      {/* TANA */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
          <span
            className="h-1.5 w-1.5 flex-none rounded-full"
            style={{ backgroundColor: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }}
          />
          <span className="truncate" style={{ color: rarity.color, opacity: 0.9 }}>
            {typeLabel || rarity.label}
            {typeLabel ? ` · ${rarity.label}` : ''}
          </span>
        </div>

        <Link
          href={`/mahsulot/${p.id}`}
          className="mt-1 line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-tight transition-colors hover:text-accent"
        >
          {p.name}
        </Link>

        {p.wear && <WearBar wear={p.wear} minFloat={p.minFloat} maxFloat={p.maxFloat} />}

        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">{t('from')}</div>
              <div className="text-lg font-bold leading-tight">{formatPrice(p.price)}</div>
            </div>
            <span className="pb-0.5 text-xs text-muted">×{stock}</span>
          </div>

          <button
            onClick={onAdd}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${
              added
                ? 'border-accent/60 bg-accent text-ink'
                : 'border-white/15 bg-white/[0.06] text-white hover:border-accent/50 hover:bg-white/10 hover:shadow-[0_0_18px_rgba(198,255,0,0.3)] hover:text-accent'
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
