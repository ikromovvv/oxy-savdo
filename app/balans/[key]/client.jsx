'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import PickCard from '@/components/PickCard';
import Select from '@/components/Select';
import { ProductMedia } from '@/components/ProductCard';
import { ShoppingCart, Check, X, Search } from '@/components/icons';
import { buildSets } from '@/lib/balanceSets';
import { weaponTypes } from '@/lib/products';
import { WEAR_TIERS } from '@/lib/skinMeta';
import { TXT, fmt, useBalancePool } from '../shared';

const PAGE = 60;
const TIER_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };

const T2 = {
  uz: {
    selected: 'Tanlangan skinlar',
    sum: 'Umumiy summa',
    over: 'Balansdan oshdi',
    empty: "Skinlarni chapdagi katalogdan bosib tanlang",
    addCart: "Savatga qo'shish",
    buyNow: 'Sotib olish',
    clear: 'Tozalash',
    search: 'Skin nomi bo‘yicha qidirish',
    from: 'Narx dan',
    to: 'Narx gacha',
    all: 'Hammasi',
    more: "Yana ko'rsatish",
    found: 'topildi',
    popular: 'Ommabop',
    priceAsc: 'Narx: arzonidan',
    priceDesc: 'Narx: qimmatidan',
  },
  ru: {
    selected: 'Выбранные скины',
    sum: 'Общая сумма',
    over: 'Больше баланса',
    empty: 'Выберите скины в каталоге слева',
    addCart: 'В корзину',
    buyNow: 'Купить',
    clear: 'Очистить',
    search: 'Поиск по названию',
    from: 'Цена от',
    to: 'Цена до',
    all: 'Все',
    more: 'Показать ещё',
    found: 'найдено',
    popular: 'Популярные',
    priceAsc: 'Цена: по возрастанию',
    priceDesc: 'Цена: по убыванию',
  },
};

// To'plam tuzish sahifasi: chapda filtrli skinlar katalogi, o'ngda tanlangan skinlar (savatcha)
export default function SetClient({ setKey }) {
  const { lang, add, items: cart, setCartOpen } = useStore();
  const L = TXT[lang] || TXT.uz;
  const S = T2[lang] || T2.uz;
  const sp = useSearchParams();
  const raw = Number(sp.get('budget'));
  const budget = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 500000;

  // ---- tayyor to'plam (boshlang'ich tanlov)
  const { pool, status } = useBalancePool(budget);
  const sets = useMemo(() => buildSets(pool, budget), [pool, budget]);
  const current = sets.find((s) => s.key === setKey);
  const others = sets.filter((s) => s.key !== setKey);
  const [name, desc] = L.names[setKey] || [setKey, ''];

  const [selected, setSelected] = useState([]);
  const initFor = useRef(null);
  useEffect(() => {
    const sig = `${setKey}|${budget}`;
    if (current && initFor.current !== sig) {
      initFor.current = sig;
      setSelected(current.items);
    }
  }, [current, setKey, budget]);

  const selIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const total = selected.reduce((s, p) => s + p.price, 0);
  const left = budget - total;
  const toggle = useCallback((p) => setSelected((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p])), []);

  // ---- katalog + filtrlar
  const [query, setQuery] = useState('');
  const [weaponType, setWeaponType] = useState('all');
  const [wears, setWears] = useState([]);
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState(String(budget)); // standart: balansdan oshmaydigan skinlar
  const [sort, setSort] = useState('price_desc');
  const [list, setList] = useState([]);
  const [total_, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const reqId = useRef(0);

  // filtr o'zgarsa — boshidan; yozish to'xtagach so'rov
  const filterKey = [query, weaponType, wears.join(','), priceFrom, priceTo, sort].join('|');
  useEffect(() => {
    const id = setTimeout(() => {
      setOffset(0);
      load(0, true);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  function load(off, replace) {
    const my = ++reqId.current;
    setLoading(true);
    const q = new URLSearchParams({
      query,
      weaponType,
      wear: wears.length ? wears.join(',') : 'all',
      priceFrom,
      priceTo,
      sort,
      limit: String(PAGE),
      offset: String(off),
    });
    fetch('/api/skins?' + q)
      .then((r) => r.json())
      .then((d) => {
        if (my !== reqId.current) return;
        setList((prev) => (replace ? d.items || [] : [...prev, ...(d.items || [])]));
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => my === reqId.current && setLoading(false));
  }

  function more() {
    const next = offset + PAGE;
    setOffset(next);
    load(next, false);
  }

  function toggleWear(n) {
    setWears((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n]));
  }

  // ---- savatga
  function addSelected() {
    const inCart = new Set(cart.map((x) => x.id));
    selected.filter((p) => !inCart.has(p.id)).forEach((p) => add(p));
  }
  const [added, setAdded] = useState(false);
  function onAdd() {
    addSelected();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }
  function onBuy() {
    addSelected();
    setCartOpen(true);
  }

  const sortOptions = [
    { value: 'count_desc', label: S.popular },
    { value: 'price_asc', label: S.priceAsc },
    { value: 'price_desc', label: S.priceDesc },
  ];
  const inputCls = 'w-full rounded-xl border border-line bg-ink/40 px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-white/40';

  return (
    <section className="container-wide pb-12 pt-6">
      <Link href="/balans" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-white">
        ← {L.back}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
      <p className="mt-1 text-sm text-muted">
        {desc} · {L.budgetLabel}: {fmt(budget)} so&apos;m
      </p>

      {status === 'error' && <div className="mt-4 text-sm text-red-300">{L.error}</div>}
      {status === 'ok' && !current && <div className="mt-4 text-sm text-muted">{L.notFound}</div>}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* O'NG (mobilda tepada): tanlangan skinlar */}
        <aside className="card order-first flex w-full flex-none flex-col gap-4 p-4 sm:p-5 lg:order-last lg:sticky lg:top-20 lg:w-[400px] xl:w-[440px]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{S.selected}</h2>
            <div className="text-right">
              <div className="text-xs text-muted">{S.sum}</div>
              <div className="text-xl font-bold leading-tight">{fmt(total)} so&apos;m</div>
            </div>
          </div>

          <div className="admin-scroll max-h-[44vh] min-h-[120px] overflow-y-auto rounded-xl border border-line bg-ink/30 p-2">
            {selected.length === 0 ? (
              <div className="grid h-[104px] place-items-center px-4 text-center text-xs text-muted">{S.empty}</div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {selected.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    title={p.name}
                    className="group relative overflow-hidden rounded-lg border border-line bg-panel px-1 pb-1 pt-0.5 text-left transition hover:border-red-400/60"
                  >
                    <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className="relative aspect-[4/3]" />
                    <div className="truncate text-[10px] text-white/80">{p.name}</div>
                    <div className="text-[10px] text-white/45">{fmt(p.price)}</div>
                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-white/70 opacity-0 transition group-hover:opacity-100">
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              {selected.length} {L.items}
            </span>
            <span className={left < 0 ? 'font-semibold text-red-300' : 'text-white/50'}>
              {left < 0 ? `${S.over}: ${fmt(-left)}` : `${L.left}: ${fmt(left)}`} so&apos;m
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onAdd} disabled={!selected.length} className="btn-ghost flex-1 disabled:cursor-not-allowed disabled:opacity-40">
              {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
              {added ? L.added : S.addCart}
            </button>
            <button onClick={onBuy} disabled={!selected.length} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40">
              {S.buyNow}
            </button>
          </div>
          {selected.length > 0 && (
            <button onClick={() => setSelected([])} className="self-start text-xs text-muted transition hover:text-white">
              {S.clear}
            </button>
          )}
        </aside>

        {/* CHAP: filtr + katalog */}
        <div className="min-w-0 flex-1">
          <div className="card space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={S.search} className={`${inputCls} pl-9`} />
              </label>
              <input type="number" inputMode="numeric" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder={S.from} className={`${inputCls} !w-32`} />
              <input type="number" inputMode="numeric" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder={S.to} className={`${inputCls} !w-32`} />
              <Select value={sort} onChange={setSort} options={sortOptions} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {WEAR_TIERS.map((tier) => {
                const active = wears.includes(tier.name);
                const c = TIER_COLOR[tier.key];
                return (
                  <button
                    key={tier.key}
                    onClick={() => toggleWear(tier.name)}
                    aria-pressed={active}
                    title={tier.name}
                    className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
                    style={active ? { borderColor: `${c}99`, background: `${c}22`, color: c } : { borderColor: '#1E1E21', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.03)' }}
                  >
                    {tier.key}
                  </button>
                );
              })}
              <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
              {[{ slug: 'all', [lang]: S.all }, ...weaponTypes].map((w) => {
                const active = weaponType === w.slug;
                return (
                  <button
                    key={w.slug}
                    onClick={() => setWeaponType(w.slug)}
                    aria-pressed={active}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${active ? 'border-white/40 bg-white/10 text-white' : 'border-line text-white/65 hover:border-white/30'}`}
                  >
                    {w[lang] || w.uz}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 mt-3 text-xs text-muted">{loading && !list.length ? '…' : `${fmt(total_)} ${S.found}`}</div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 min-[1700px]:grid-cols-5">
            {list.map((p) => (
              <PickCard key={p.id} product={p} selected={selIds.has(p.id)} onToggle={toggle} />
            ))}
            {loading && !list.length && Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-52 animate-pulse rounded-xl border border-line bg-white/[0.04]" />)}
          </div>

          {list.length < total_ && (
            <div className="mt-5 text-center">
              <button onClick={more} disabled={loading} className="btn-ghost disabled:opacity-50">
                {loading ? '…' : S.more}
              </button>
            </div>
          )}
        </div>
      </div>

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
