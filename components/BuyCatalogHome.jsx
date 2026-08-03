'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import SkinCard from './SkinCard';
import { weaponTypes as weaponTypeLabels } from '@/lib/products';

const PAGE_SIZE = 60;

export default function BuyCatalogHome() {
  const { t, lang } = useStore();

  const [query, setQuery] = useState('');
  const [weaponType, setWeaponType] = useState('all');
  const [wear, setWear] = useState('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [sort, setSort] = useState('price_desc');

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [availableWeaponTypes, setAvailableWeaponTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const requestId = useRef(0);

  const wearOptions = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

  const fetchPage = useCallback(
    async (offset, append) => {
      const id = ++requestId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        query,
        weaponType,
        wear,
        priceFrom,
        priceTo,
        sort,
        limit: String(PAGE_SIZE),
        offset: String(offset),
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
    [query, weaponType, wear, priceFrom, priceTo, sort]
  );

  // filtr o'zgarsa — kutib turib (debounce) 0-offsetdan qayta yuklaymiz
  useEffect(() => {
    const timer = setTimeout(() => fetchPage(0, false), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, weaponType, wear, priceFrom, priceTo, sort]);

  function resetFilters() {
    setQuery('');
    setWeaponType('all');
    setWear('all');
    setPriceFrom('');
    setPriceTo('');
  }

  function loadMore() {
    fetchPage(items.length, true);
  }

  const tabs = weaponTypeLabels.filter((w) => availableWeaponTypes.includes(w.slug));
  const hasMore = items.length < total;

  return (
    <section className="container-site py-10">
      <div className="mb-6">
        <span className="label">OXY</span>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('catalog_title')}</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">{t('catalog_subtitle')}</p>
      </div>

      {/* QUROL TURI TABLARI */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setWeaponType('all')}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            weaponType === 'all' ? 'border-white bg-white text-ink' : 'border-line text-white/80 hover:border-white/40'
          }`}
        >
          {t('catalog_all')}
        </button>
        {tabs.map((w) => (
          <button
            key={w.slug}
            onClick={() => setWeaponType(w.slug)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              weaponType === w.slug
                ? 'border-white bg-white text-ink'
                : 'border-line text-white/80 hover:border-white/40'
            }`}
          >
            {w[lang]}
          </button>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={resetFilters}
          title={t('catalog_reset')}
          className="grid h-10 w-10 flex-none place-items-center rounded-full border border-line transition hover:border-white/40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('catalog_search_ph')}
          className="min-w-[180px] flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-full border border-line bg-panel px-4 py-2.5 text-sm outline-none focus:border-white/40"
        >
          <option value="price_desc">{t('catalog_sort_price')} ↓</option>
          <option value="price_asc">{t('catalog_sort_price')} ↑</option>
        </select>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* CHAP: FILTRLAR */}
        <aside className="card w-full flex-none p-5 lg:w-[240px]">
          <div className="label mb-3">{t('catalog_sort_price')}</div>
          <div className="flex flex-col gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder={t('catalog_price_from')}
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
            />
            <input
              type="number"
              inputMode="numeric"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              placeholder={t('catalog_price_to')}
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
            />
          </div>

          <div className="label mb-3 mt-6">{t('catalog_wear')}</div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="wear"
                checked={wear === 'all'}
                onChange={() => setWear('all')}
                className="accent-white"
              />
              {t('catalog_all')}
            </label>
            {wearOptions.map((w) => (
              <label key={w} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  name="wear"
                  checked={wear === w}
                  onChange={() => setWear(w)}
                  className="accent-white"
                />
                {w}
              </label>
            ))}
          </div>
        </aside>

        {/* O'NG: GRID */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card aspect-[3/4] animate-pulse bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">
                {error === 'network_error' ? t('sell_network_error') : t('sell_error')}
              </p>
              <button onClick={() => fetchPage(0, false)} className="btn-ghost mt-4 inline-flex">
                {t('sell_refresh')}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">{t('catalog_empty')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <SkinCard key={p.id} product={p} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button onClick={loadMore} disabled={loadingMore} className="btn-ghost">
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
