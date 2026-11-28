'use client';

import { pick } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import CatalogCard from '@/components/CatalogCard';
import { ProductMedia } from '@/components/ProductCard';
import { ShoppingCart, Check } from '@/components/icons';
import { buildSets, popularWithin } from '@/lib/balanceSets';
import { TXT, fmt, useBalancePool } from './shared';

const QUICK = [200000, 500000, 1000000, 3000000];

export default function BalansClient() {
  const router = useRouter();
  const { lang, balance, add } = useStore();
  const L = pick(TXT, lang);

  const [input, setInput] = useState('');
  const [budget, setBudget] = useState(500000);
  const [addedKey, setAddedKey] = useState(null);
  const { pool, status } = useBalancePool(budget);

  // kirgan foydalanuvchi balansi bo'lsa — boshlang'ich qiymat sifatida
  useEffect(() => {
    if (balance > 0) {
      setBudget(Math.round(balance));
      setInput(String(Math.round(balance)));
    }
  }, [balance]);

  // yozish to'xtagach so'rov
  useEffect(() => {
    const n = Number(input);
    if (!input || !Number.isFinite(n) || n <= 0) return;
    const id = setTimeout(() => setBudget(Math.round(n)), 500);
    return () => clearTimeout(id);
  }, [input]);

  const sets = useMemo(() => buildSets(pool, budget), [pool, budget]);
  const popular = useMemo(() => popularWithin(pool, budget, 20), [pool, budget]);

  function addAll(set) {
    set.items.forEach((p) => add(p));
    setAddedKey(set.key);
    setTimeout(() => setAddedKey(null), 1500);
  }

  const chip = 'rounded-lg border px-3 py-2 text-sm transition';
  const openSet = (key) => router.push(`/balans/${key}?budget=${budget}`);

  return (
    <section className="container-wide pb-12 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{L.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{L.sub}</p>

      <div className="card mt-6 flex flex-wrap items-end gap-4 p-5">
        <label className="block w-full sm:w-64">
          <span className="label mb-2 block">{L.budget}</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fmt(budget)}
            className="w-full rounded-xl border border-line bg-ink/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => {
                setInput(String(q));
                setBudget(q);
              }}
              className={`${chip} ${budget === q ? 'border-white/40 bg-white/10 text-white' : 'border-line text-white/70 hover:border-white/30'}`}
            >
              {fmt(q)}
            </button>
          ))}
          {balance > 0 && (
            <button
              onClick={() => {
                setInput(String(Math.round(balance)));
                setBudget(Math.round(balance));
              }}
              className={`${chip} border-accent/50 text-accent hover:bg-accent/10`}
            >
              {L.mine}: {fmt(balance)}
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && <div className="mt-8 text-sm text-muted">{L.loading}</div>}
      {status === 'error' && <div className="mt-8 text-sm text-red-300">{L.error}</div>}
      {status === 'ok' && !sets.length && !popular.length && <div className="mt-8 text-sm text-muted">{L.empty}</div>}

      {status === 'ok' && sets.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">{L.sets}</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 min-[1700px]:grid-cols-5">
            {sets.map((s) => {
              const [name, desc] = L.names[s.key] || [s.key, ''];
              const cols = s.items.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';
              return (
                <div
                  key={s.key}
                  role="link"
                  tabIndex={0}
                  onClick={() => openSet(s.key)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openSet(s.key))}
                  className="card card-hover flex max-h-[440px] cursor-pointer sm:h-[440px] flex-col p-3 text-left outline-none focus-visible:border-white/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{name}</div>
                      <div className="mt-0.5 truncate text-xs text-muted">{desc}</div>
                    </div>
                    <span className="flex-none rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/65">
                      {s.items.length} {L.items}
                    </span>
                  </div>

                  <div className={`admin-scroll mt-2.5 grid min-h-0 flex-1 content-start ${cols} gap-1.5 overflow-y-auto`}>
                    {s.items.map((p) => (
                      <div key={p.id} className="relative overflow-hidden rounded-lg border border-line bg-ink/40 px-1.5 pb-1.5 pt-0.5">
                        <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className="relative aspect-[3/2]" />
                        <div className="truncate text-[10px] text-white/80">{p.name}</div>
                        <div className="text-[10px] text-white/45">{fmt(p.price)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex-none pt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">{L.total}</span>
                      <span className="text-base font-bold">{fmt(s.total)} so&apos;m</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-white/45">
                      <span>{L.left}</span>
                      <span>{fmt(Math.max(0, budget - s.total))} so&apos;m</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addAll(s);
                      }}
                      className="btn-primary mt-2.5 w-full !py-2"
                    >
                      {addedKey === s.key ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
                      {addedKey === s.key ? L.added : L.addAll}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {status === 'ok' && popular.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">{L.popular}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5">
            {popular.map((p) => (
              <CatalogCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
