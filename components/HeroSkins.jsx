'use client';

import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';
import { ProductMedia } from './ProductCard';
import { formatPrice } from '@/lib/products';
import { rarityInfo, rarityRgb } from '@/lib/skinMeta';

// Kirmagan foydalanuvchiga katalogdan "tizer": turli turdagi 6 ta skin,
// rariteti rangida neon nur bilan. Bosilsa Steam orqali kirishga olib boradi.
const PICK_TYPES = ['knife', 'gloves', 'rifle', 'sniper', 'pistol', 'smg'];

export default function HeroSkins() {
  const { t } = useStore();
  const [items, setItems] = useState(null); // null = yuklanmoqda, [] = yo'q

  useEffect(() => {
    let alive = true;
    fetch('/api/skins?limit=120&sort=price_desc')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list = Array.isArray(d.items) ? d.items : [];
        const picked = [];
        for (const type of PICK_TYPES) {
          const hit = list.find((s) => s.weaponType === type && !picked.includes(s));
          if (hit) picked.push(hit);
        }
        setItems(picked);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  if (items && items.length === 0) return null; // skinlar yuklanmasa — blok ko'rinmaydi

  return (
    <div className="mt-14 w-full">
      <div className="mb-4 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        {t('hero_live')}
      </div>

      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-4 pt-1 text-left sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
        {items === null
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[15.5rem] w-[11.5rem] flex-none animate-pulse rounded-2xl border border-line bg-white/[0.04] lg:w-auto" />
            ))
          : items.map((p) => {
              const r = rarityInfo(p);
              return (
                <a
                  key={p.id}
                  href="/api/auth/steam/login"
                  className="hero-skin w-[11.5rem] lg:w-auto"
                  style={{ '--rc': rarityRgb(r.color) }}
                >
                  <span
                    className="absolute inset-x-0 top-0 z-10 h-[2px]"
                    style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }}
                    aria-hidden="true"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-[34%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-2xl"
                    style={{ background: r.color }}
                  />
                  <div className="relative px-3 pt-4">
                    <ProductMedia product={p} className="relative aspect-[4/3] rounded-lg" />
                  </div>
                  <div className="relative px-3 pb-3 pt-2">
                    <div className="truncate text-xs font-semibold">{p.name}</div>
                    <div className="mt-0.5 truncate text-[10px] uppercase tracking-wide" style={{ color: r.color }}>
                      {r.label}
                    </div>
                    <div className="mt-1 text-sm font-bold">{formatPrice(p.price)}</div>
                  </div>
                </a>
              );
            })}
      </div>
    </div>
  );
}
