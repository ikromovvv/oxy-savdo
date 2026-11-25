'use client';

import { RotateCw, Search, SlidersHorizontal, ChevronDown, ChevronRight } from './icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import CatalogCard from './CatalogCard';
import { weaponTypes as weaponTypeLabels } from '@/lib/products';
import { WEAR_TIERS } from '@/lib/skinMeta';
import Select from './Select';

const TIER_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };
const RARITY_DOT = {
  'Consumer Grade': '#b0c3d9', 'Industrial Grade': '#5e98d9', 'Mil-Spec Grade': '#4b69ff', Restricted: '#8847ff',
  Classified: '#d32ce6', Covert: '#eb4b4b', Extraordinary: '#e4ae39', Contraband: '#e4ae39',
};
const PAGE_SIZE = 60;

// ---- float oralig'i <-> wear ro'yxati (katalog nom darajasida: float oralig'i mos holatlarga aylantiriladi) ----
const wearFromRange = (lo, hi) => {
  const ts = WEAR_TIERS.filter((t) => t.max > lo && t.min < hi);
  return ts.length === 0 || ts.length === WEAR_TIERS.length ? 'all' : ts.map((t) => t.name).join(',');
};
const rangeFromWear = (wear) => {
  if (!wear || wear === 'all') return [0, 1];
  const ts = WEAR_TIERS.filter((t) => wear.split(',').includes(t.name));
  return ts.length ? [Math.min(...ts.map((t) => t.min)), Math.max(...ts.map((t) => t.max))] : [0, 1];
};

function Acc({ title, open, onToggle, children }) {
  return (
    <div className="border-t border-line first:border-t-0">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-4 text-left text-[15px] font-semibold transition hover:bg-white/[0.03]">
        {title}
        {open ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function BuyCatalogHome() {
  const { t, lang } = useStore();

  const [query, setQuery] = useState('');
  const [weaponType, setWeaponType] = useState('all');
  const [wear, setWear] = useState('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [sort, setSort] = useState('count_desc');
  const [rarity, setRarity] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fl, setFl] = useState([0, 1]);
  const [open, setOpen] = useState({ price: false, wear: false, rarity: false, float: true, more: false });
  const tog = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [weaponCounts, setWeaponCounts] = useState({});
  const [availableWeaponTypes, setAvailableWeaponTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const requestId = useRef(0);

  const fetchPage = useCallback(
    async (offset, append) => {
      const id = ++requestId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        query, weaponType, wear, rarity, availability, priceFrom, priceTo, sort,
        limit: String(PAGE_SIZE), offset: String(offset),
      });

      try {
        const res = await fetch(`/api/skins?${params.toString()}`);
        const data = await res.json();
        if (id !== requestId.current) return; // eskirgan so'rov

        if (data.error) {
          setError(data.error);
          if (!append) setItems([]);
        } else {
          setItems((prev) => (append ? [...prev, ...data.items] : data.items));
          setTotal(data.total || 0);
          if (data.weaponCounts) setWeaponCounts(data.weaponCounts);
          if (data.weaponTypes?.length) setAvailableWeaponTypes(data.weaponTypes);
        }
      } catch (e) {
        if (id !== requestId.current) return;
        setError('network_error');
        if (!append) setItems([]);
      } finally {
        if (id !== requestId.current) return;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, weaponType, wear, rarity, availability, priceFrom, priceTo, sort]
  );

  // filtr o'zgarsa — kutib turib (debounce) 0-offsetdan qayta yuklaymiz
  useEffect(() => {
    const timer = setTimeout(() => fetchPage(0, false), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, weaponType, wear, rarity, availability, priceFrom, priceTo, sort]);

  // wear tugmalari o'zgarsa — float slayderi ham moslanadi
  useEffect(() => {
    setFl((prev) => (wearFromRange(prev[0], prev[1]) === wear ? prev : rangeFromWear(wear)));
  }, [wear]);

  function setRange(lo, hi) {
    const a = Math.max(0, Math.min(lo, hi - 0.01));
    const b = Math.min(1, Math.max(hi, lo + 0.01));
    setFl([a, b]);
    setWear(wearFromRange(a, b));
  }
  function toggleWear(name) {
    const cur = wear === 'all' ? [] : wear.split(',');
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    setWear(next.length && next.length < WEAR_TIERS.length ? next.join(',') : 'all');
  }

  function resetFilters() {
    setQuery('');
    setWeaponType('all');
    setWear('all');
    setRarity('all');
    setAvailability('all');
    setPriceFrom('');
    setPriceTo('');
  }

  const tabs = weaponTypeLabels.filter((w) => availableWeaponTypes.includes(w.slug));
  const hasMore = items.length < total;
  const L =
    lang === 'ru'
      ? { filters: 'Фильтры', price: 'Цена, сум', wear: 'Состояние (wear)', rarity: 'Редкость', float: 'Float', more: 'Дополнительно', sort: 'Сортировка', found: 'Найдено', popular: 'Популярные', all: 'Все' }
      : { filters: 'Filtrlar', price: "Narx, so'm", wear: 'Holati (wear)', rarity: 'Nodirligi', float: 'Float', more: "Qo'shimcha", sort: 'Saralash', found: 'Topildi', popular: 'Ommabop', all: 'Hammasi' };

  const sortOptions = [
    { value: 'count_desc', label: `${L.sort}: ${L.popular}` },
    { value: 'price_desc', label: `${L.sort}: ${t('catalog_sort_price')} ↓` },
    { value: 'price_asc', label: `${L.sort}: ${t('catalog_sort_price')} ↑` },
  ];
  const rarityList = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert', 'Extraordinary', 'Contraband'];
  const availOptions = [
    { value: 'all', label: t('avail_all') },
    { value: 'now', label: t('avail_now') },
    { value: 'later', label: t('avail_later') },
  ];
  const inputCls = 'w-full rounded-xl border border-line bg-ink/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40';
  const selectedWears = wear === 'all' ? [] : wear.split(',');

  const wearChips = (
    <div className="flex flex-wrap gap-1.5">
      {WEAR_TIERS.map((tier) => {
        const active = selectedWears.includes(tier.name);
        const color = TIER_COLOR[tier.key];
        return (
          <button
            key={tier.key}
            onClick={() => toggleWear(tier.name)}
            aria-pressed={active}
            title={tier.name}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
            style={active ? { borderColor: `${color}99`, background: `${color}22`, color } : { borderColor: '#1E1E21', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.03)' }}
          >
            {tier.key}
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="container-site py-8">
      {/* sarlavha + qidiruv / saralash */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label">OXY</span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('catalog_title')}</h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">{L.found}</div>
          <div className="text-2xl font-semibold tracking-tight">{loading && !total ? '…' : total.toLocaleString('ru-RU')}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalog_search_ph')}
            className="w-full rounded-2xl border border-line bg-panel py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
          />
        </label>
        <Select value={sort} onChange={setSort} options={sortOptions} />
      </div>

      {/* kategoriyalar */}
      <div className="no-scrollbar -mx-5 mt-4 flex gap-1.5 overflow-x-auto border-y border-line px-5 py-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:border-x-0 sm:px-0">
        {[{ slug: 'all', label: L.all }, ...tabs.map((w) => ({ slug: w.slug, label: w[lang] || w.uz }))].map((c) => {
          const active = weaponType === c.slug;
          return (
            <button
              key={c.slug}
              onClick={() => setWeaponType(c.slug)}
              className={`flex-none whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition ${
                active ? 'border-white/20 bg-white/10 text-white' : 'border-transparent text-white/70 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {c.label}
              {c.slug !== 'all' && weaponCounts[c.slug] ? <span className="ml-1.5 text-[11px] text-white/40">{weaponCounts[c.slug].toLocaleString('ru-RU')}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium lg:hidden"
        >
          <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />{L.filters}</span>
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* CHAP: FILTRLAR (akkordeon) */}
        <aside className={`card filters-aside w-full flex-none overflow-hidden p-0 lg:block lg:w-[300px] ${filtersOpen ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2.5 px-5 py-4 text-lg font-semibold">
            <SlidersHorizontal className="h-5 w-5" />
            {L.filters}
          </div>

          <Acc title={L.price} open={open.price} onToggle={() => tog('price')}>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="numeric" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder={t('catalog_price_from')} className={inputCls} />
              <input type="number" inputMode="numeric" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder={t('catalog_price_to')} className={inputCls} />
            </div>
          </Acc>

          <Acc title={L.wear} open={open.wear} onToggle={() => tog('wear')}>
            {wearChips}
          </Acc>

          <Acc title={L.rarity} open={open.rarity} onToggle={() => tog('rarity')}>
            <div className="flex flex-col gap-1">
              {rarityList.map((r) => {
                const active = rarity === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRarity(active ? 'all' : r)}
                    aria-pressed={active}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/[0.05]'}`}
                  >
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: RARITY_DOT[r], boxShadow: `0 0 6px ${RARITY_DOT[r]}` }} />
                    {r.replace(' Grade', '')}
                  </button>
                );
              })}
            </div>
          </Acc>

          <Acc title={L.float} open={open.float} onToggle={() => tog('float')}>
            <div className="catalog-range relative mt-1 h-6">
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${fl[0] * 100}%`, right: `${(1 - fl[1]) * 100}%` }} />
              <input type="range" min="0" max="1" step="0.01" value={fl[0]} onChange={(e) => setRange(Number(e.target.value), fl[1])} aria-label="float min" className="catalog-range-input" />
              <input type="range" min="0" max="1" step="0.01" value={fl[1]} onChange={(e) => setRange(fl[0], Number(e.target.value))} aria-label="float max" className="catalog-range-input" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input type="number" min="0" max="1" step="0.01" value={fl[0].toFixed(2)} onChange={(e) => setRange(Number(e.target.value) || 0, fl[1])} className={inputCls} />
              <span className="text-white/40">—</span>
              <input type="number" min="0" max="1" step="0.01" value={fl[1].toFixed(2)} onChange={(e) => setRange(fl[0], Number(e.target.value) || 1)} className={inputCls} />
            </div>
            <div className="mt-3">{wearChips}</div>
          </Acc>

          <Acc title={L.more} open={open.more} onToggle={() => tog('more')}>
            <div className="mb-2 text-xs text-muted">{t('catalog_avail')}</div>
            <Select value={availability} onChange={setAvailability} options={availOptions} />
          </Acc>

          <div className="border-t border-line p-4">
            <button onClick={resetFilters} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm transition hover:border-white/40">
              <RotateCw className="h-4 w-4" strokeWidth={2} />
              {t('catalog_reset')}
            </button>
          </div>
        </aside>

        {/* O'NG: GRID */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card aspect-[3/4] animate-pulse bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">{error === 'network_error' ? t('sell_network_error') : t('sell_error')}</p>
              <button onClick={() => fetchPage(0, false)} className="btn-ghost mt-4 inline-flex">{t('sell_refresh')}</button>
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">{t('catalog_empty')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((p) => (
                  <CatalogCard key={p.id} product={p} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button onClick={() => fetchPage(items.length, true)} disabled={loadingMore} className="btn-ghost">
                    {loadingMore ? t('sell_sending') : t('catalog_load_more')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
