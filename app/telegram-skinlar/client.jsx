'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import Select from '@/components/Select';
import TgSkinCard from '@/components/TgSkinCard';
import { SortLabel, ArrowUpRight, X } from '@/components/icons';

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

  // qidiruv header'dagi maydondan keladi (URL ?q= yoki 'oxy:search' hodisasi)
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get('q') || '');
    const h = (e) => setQuery(String(e.detail ?? ''));
    window.addEventListener('oxy:search', h);
    return () => window.removeEventListener('oxy:search', h);
  }, []);

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
    <section className="container-wide pb-10 pt-4">
      {/* bitta ixcham toolbar: holat tugmalari | qidiruv, saralash, obuna, sotilganlar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <div className="no-scrollbar -mx-5 flex basis-full items-center gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:flex-1 sm:basis-0 sm:px-0">
          <button
            onClick={() => setWear('all')}
            className={`flex-none rounded-lg border px-4 py-2 text-sm font-medium transition ${
              wear === 'all' ? 'border-white/20 bg-white/10 text-white' : 'border-transparent text-white/70 hover:bg-white/[0.05] hover:text-white'
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
                className="flex-none rounded-lg border px-4 py-2 text-sm font-semibold transition"
                style={on ? { borderColor: `${c}99`, background: `${c}22`, color: c } : { borderColor: 'transparent', color: 'rgba(255,255,255,0.7)' }}
              >
                {k}
              </button>
            );
          })}
        </div>

        <Select
          value={sort}
          onChange={setSort}
          options={[
            { value: 'new', label: t('tg_sort_new') },
            { value: 'asc', label: <SortLabel text={t('tg_sort_asc').replace(/\s*[↑↓]/, '')} dir="asc" /> },
            { value: 'desc', label: <SortLabel text={t('tg_sort_desc').replace(/\s*[↑↓]/, '')} dir="desc" /> },
          ]}
        />
        <button
          onClick={() => setShowSold((v) => !v)}
          className={`flex-none rounded-xl border px-4 py-2.5 text-sm transition ${
            showSold ? 'border-white/40 bg-white/10 text-white' : 'border-line text-white/65 hover:border-white/40 hover:text-white'
          }`}
        >
          {t('tg_show_sold')}
        </button>
        {data?.link && (
          <a href={data.link} target="_blank" rel="noreferrer" className="flex-none rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/40 hover:text-white">
            {t('tg_follow')} <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* natija */}
      {error ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">{t('tg_error')}</p>
          <button onClick={load} className="btn-ghost mt-4 inline-flex">{t('sell_refresh')}</button>
        </div>
      ) : data === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card aspect-[3/4] animate-pulse bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">{t('tg_empty')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((p) => (
            <TgSkinCard key={p.id} item={p} onOpen={setLightbox} />
          ))}
        </div>
      )}

      {/* katta rasm */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button aria-label="close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
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
