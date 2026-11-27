'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import CatalogCard from '@/components/CatalogCard';
import { ShoppingCart, Check } from '@/components/icons';
import { buildSets, popularWithin } from '@/lib/balanceSets';
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

  // to'plamdagi skinlar birinchi, keyin shu balansga mos ommabop skinlar katalogi (jami 3 qator)
  const feed = useMemo(() => {
    if (!current) return [];
    const inSet = new Set(current.items.map((p) => p.id));
    const names = new Set(current.items.map((p) => p.name));
    const extra = popularWithin(pool, budget, 40).filter((p) => !inSet.has(p.id) && !names.has(p.name));
    return [...current.items.map((p) => ({ p, mine: true })), ...extra.map((p) => ({ p, mine: false }))].slice(0, 15);
  }, [current, pool, budget]);
  const showAt = (i) => (i >= 12 ? 'hidden xl:block' : i >= 9 ? 'hidden lg:block' : i >= 6 ? 'hidden md:block' : '');

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
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {feed.map(({ p, mine }, i) => (
              <div key={p.id} className={`${showAt(i)} ${mine ? 'rounded-2xl ring-1 ring-accent/70' : ''}`}>
                <CatalogCard product={p} />
              </div>
            ))}
          </div>

          <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
            <div>
              <div className="label">
                {current.items.length} {L.items}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-sm text-muted">{L.total}</span>
                <span className="text-2xl font-bold">{fmt(current.total)} so&apos;m</span>
                <span className="text-xs text-white/50">
                  {L.left}: {fmt(Math.max(0, budget - current.total))} so&apos;m
                </span>
              </div>
            </div>
            <button onClick={addAll} className="btn-primary w-full sm:w-auto sm:min-w-[260px]">
              {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
              {added ? L.added : L.addAll}
            </button>
          </div>
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
