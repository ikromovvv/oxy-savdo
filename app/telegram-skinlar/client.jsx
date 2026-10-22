'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import Select from '@/components/Select';
import TgSkinCard from '@/components/TgSkinCard';

const TIER_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };

export default function TelegramSkinsClient() {
  const { t } = useStore();
  const [data, setData] = useState(null); // null = yuklanmoqda
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [wear, setWear] = useState('all');
  const [sort, setSort] = useState('new');
  const [showSold, setShowSold] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(() => {
    setError(false);
    setData(null);
    fetch('/api/tg-skins')
      .then((r) => r.json())
      .then((d) => (d.error && !(d.items || []).length ? setError(true) : setData(d)))
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === 'Escape' && setLightbox(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const items = useMemo(() => {
    let list = data?.items || [];
    if (!showSold) list = list.filter((x) => x.status === 'available');
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((x) => x.name.toLowerCase().includes(q));
    if (wear !== 'all') list = list.filter((x) => x.quality === wear);
    const price = (x) => (x.priceUzs == null ? Infinity : x.priceUzs);
    list = [...list];
    if (sort === 'asc') list.sort((a, b) => price(a) - price(b));
    else if (sort === 'desc') list.sort((a, b) => (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)));
    else list.sort((a, b) => (a.status === b.status ? b.postedAt - a.postedAt : a.status === 'available' ? -1 : 1));
    return list;
  }, [data, query, wear, sort, showSold]);

  return (
    <section className="container-site py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label">OXY</span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('tg_title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{t('tg_sub')}</p>
        </div>
        {data?.link && (
          <a href={data.link} target="_blank" rel="noreferrer" className="btn-ghost flex-none">
            {t('tg_follow')} ↗
          </a>
        )}
      </div>

      {/* filtrlar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('catalog_search_ph')}
          className="min-w-[180px] flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
        />
        <Select
          value={sort}
          onChange={setSort}
          options={[
            { value: 'new', label: t('tg_sort_new') },
            { value: 'asc', label: t('tg_sort_asc') },
            { value: 'desc', label: t('tg_sort_desc') },
          ]}
        />
      </div>

      <div className="no-scrollbar -mx-5 mb-6 flex items-center gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button
          onClick={() => setWear('all')}
          className={`flex-none rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
            wear === 'all' ? 'border-accent/60 bg-accent/15 text-white shadow-[0_0_14px_rgba(198,255,0,0.25)]' : 'border-line text-white/75 hover:border-white/40'
          }`}
        >
          {t('catalog_all')}
        </button>
        {Object.keys(TIER_COLOR).map((k) => {
          const on = wear === k;
          const c = TIER_COLOR[k];
          return (
            <button
              key={k}
              onClick={() => setWear(on ? 'all' : k)}
              className="flex-none rounded-full border px-4 py-2 text-xs font-bold transition-all"
              style={on ? { borderColor: `${c}99`, background: `${c}22`, color: c, boxShadow: `0 0 12px ${c}55` } : { borderColor: '#1E1E21', color: 'rgba(255,255,255,0.7)' }}
            >
              {k}
            </button>
          );
        })}
        <button
          onClick={() => setShowSold((v) => !v)}
          className={`ml-auto flex-none rounded-full border px-4 py-2 text-xs transition-all ${
            showSold ? 'border-white/40 bg-white/10 text-white' : 'border-line text-white/60 hover:border-white/40'
          }`}
        >
          {t('tg_show_sold')}
        </button>
      </div>

      {/* natija */}
      {error ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">{t('tg_error')}</p>
          <button onClick={load} className="btn-ghost mt-4 inline-flex">{t('sell_refresh')}</button>
        </div>
      ) : data === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card aspect-[3/4] animate-pulse bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">{t('tg_empty')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <TgSkinCard key={p.id} item={p} onOpen={setLightbox} />
          ))}
        </div>
      )}

      {/* katta rasm */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button aria-label="close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.image}
            alt={lightbox.name}
            referrerPolicy="no-referrer"
            className="max-h-[88vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
