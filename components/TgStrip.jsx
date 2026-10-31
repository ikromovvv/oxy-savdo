'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';
import { formatPrice } from '@/lib/products';
import { rarityRgb } from '@/lib/skinMeta';

// Bosh sahifadagi qisqa lenta: Telegram kanaldagi eng yangi mavjud skinlar.
// E'lon bo'lmasa yoki yuklanmasa — umuman ko'rinmaydi.
export default function TgStrip() {
  const { t } = useStore();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/tg-skins')
      .then((r) => r.json())
      .then((d) => alive && setItems((d.items || []).filter((x) => x.status === 'available' && x.image).slice(0, 8)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  if (items && items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{t('tg_latest')}</h2>
        <Link href="/telegram-skinlar" className="flex-none py-2 text-xs text-accent hover:underline">
          {t('tg_all')} →
        </Link>
      </div>

      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-3 pt-1 sm:mx-0 sm:px-0">
        {items === null
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-44 w-52 flex-none animate-pulse rounded-2xl border border-line bg-white/[0.04]" />
            ))
          : items.map((p) => {
              const c = p.rarityColor || '#ffffff';
              return (
                <Link
                  key={p.id}
                  href="/telegram-skinlar"
                  className="hero-skin w-52"
                  style={{ '--rc': rarityRgb(c) }}
                >
                  <span className="absolute inset-x-0 top-0 z-10 h-[2px]" style={{ background: c, boxShadow: `0 0 10px ${c}` }} aria-hidden="true" />
                  <div className="relative px-2.5 pt-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (p.fallbackImage && el.dataset.fb !== '1') {
                          el.dataset.fb = '1';
                          el.src = p.fallbackImage;
                          el.className = el.className.replace('object-cover', 'object-contain p-2');
                        }
                      }}
                      className="aspect-[4/3] w-full rounded-lg border border-white/5 object-cover"
                    />
                  </div>
                  <div className="relative px-3 pb-3 pt-2">
                    <div className="truncate text-xs font-semibold">{p.name}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted">
                      <span>{p.quality}{p.float != null ? ` · ${p.float}` : ''}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold">{p.priceUzs != null ? formatPrice(p.priceUzs) : '—'}</div>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
