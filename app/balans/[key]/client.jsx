'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import CatalogCard from '@/components/CatalogCard';
import { ShoppingCart, Check } from '@/components/icons';
import { buildSets } from '@/lib/balanceSets';
import { TXT, fmt, useBalancePool } from '../shared';

// Bitta to'plamning alohida sahifasi: /balans/<kalit>?budget=<so'm>
export default function SetClient({ setKey }) {
  const { lang, add } = useStore();
  const L = TXT[lang] || TXT.uz;
  const sp = useSearchParams();
  const raw = Number(sp.get('budget'));
  const budget = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 500000;

  const { pool, status } = useBalancePool(budget);
  const sets = useMemo(() => buildSets(pool, budget), [pool, budget]);
  const current = sets.find((s) => s.key === setKey);
  const others = sets.filter((s) => s.key !== setKey);
  const [added, setAdded] = useState(false);

  const [name, desc] = L.names[setKey] || [setKey, ''];

  function addAll() {
    current.items.forEach((p) => add(p));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <section className="container-wide pb-12 pt-6">
      <Link href="/balans" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-white">
        ← {L.back}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
      <p className="mt-1 text-sm text-muted">
        {desc} · {L.budgetLabel}: {fmt(budget)} so&apos;m
      </p>

      {status === 'loading' && <div className="mt-8 text-sm text-muted">{L.loading}</div>}
      {status === 'error' && <div className="mt-8 text-sm text-red-300">{L.error}</div>}
      {status === 'ok' && !current && <div className="mt-8 text-sm text-muted">{L.notFound}</div>}

      {status === 'ok' && current && (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {current.items.map((p) => (
              <CatalogCard key={p.id} product={p} />
            ))}
          </div>

          <aside className="card flex w-full flex-none flex-col gap-3 p-5 lg:sticky lg:top-20 lg:w-[320px]">
            <div className="label">
              {current.items.length} {L.items}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">{L.total}</span>
              <span className="text-2xl font-bold">{fmt(current.total)} so&apos;m</span>
            </div>
            <div className="flex items-baseline justify-between text-xs text-white/50">
              <span>{L.left}</span>
              <span>{fmt(Math.max(0, budget - current.total))} so&apos;m</span>
            </div>
            <button onClick={addAll} className="btn-primary w-full">
              {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
              {added ? L.added : L.addAll}
            </button>
          </aside>
        </div>
      )}

      {status === 'ok' && others.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">{L.otherSets}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((s) => (
              <Link
                key={s.key}
                href={`/balans/${s.key}?budget=${budget}`}
                className="rounded-lg border border-line px-3 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white"
              >
                {(L.names[s.key] || [s.key])[0]} · {fmt(s.total)}
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
