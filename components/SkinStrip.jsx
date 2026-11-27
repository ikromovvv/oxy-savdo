'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';
import CatalogCard from './CatalogCard';
import { ArrowRight } from './icons';

// Bosh sahifadagi lenta: saytning o'z katalogidan eng ommabop skinlar (o'zi chiqib turadi).
// Yuklanmasa yoki bo'sh bo'lsa — umuman ko'rinmaydi.
const TXT = {
  uz: { title: 'Ommabop skinlar', all: 'Hammasi' },
  ru: { title: 'Популярные скины', all: 'Все' },
};

export default function SkinStrip() {
  const { lang } = useStore();
  const L = TXT[lang] || TXT.uz;
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({
      sort: 'count_desc',
      priceFrom: '100000',
      wear: 'Factory New,Minimal Wear,Field-Tested',
      limit: '12',
    });
    fetch('/api/skins?' + q)
      .then((r) => r.json())
      .then((d) => alive && setItems((d.items || []).filter((x) => x.image).slice(0, 10)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  if (items && items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{L.title}</h2>
        <Link href="/skinlar" className="flex-none py-2 text-xs text-accent hover:underline">
          {L.all} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-3 pt-1 sm:mx-0 sm:px-0">
        {items === null
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-72 w-60 flex-none animate-pulse rounded-2xl border border-line bg-white/[0.04]" />
            ))
          : items.map((p) => (
              <div key={p.id} className="w-60 flex-none">
                <CatalogCard product={p} />
              </div>
            ))}
      </div>
    </section>
  );
}
