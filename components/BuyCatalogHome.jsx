'use client';

import { RotateCw, SlidersHorizontal, ChevronDown, SortLabel } from './icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import CatalogCard from './CatalogCard';
import { weaponTypes as weaponTypeLabels } from '@/lib/products';
import { WEAR_TIERS } from '@/lib/skinMeta';
import Select from './Select';
import Link from 'next/link';
import { Wallet } from './icons';

const TIER_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };
const RARITY_DOT = {
  'Consumer Grade': '#b0c3d9', 'Industrial Grade': '#5e98d9', 'Mil-Spec Grade': '#4b69ff', Restricted: '#8847ff',
  Classified: '#d32ce6', Covert: '#eb4b4b', Extraordinary: '#e4ae39', Contraband: '#e4ae39',
};
const PAGE_SIZE = 60;

export default function BuyCatalogHome() {
  const { t, lang } = useStore();

  const [query, setQuery] = useState('');
  const [weaponType, setWeaponType] = useState('all');
  const [wear, setWear] = useState('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [sort, setSort] = useState('price_asc');
  const [rarity, setRarity] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // qidiruv header'dagi maydondan keladi (URL ?q= yoki 'oxy:search' hodisasi)
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get('q') || '');
    const h = (e) => setQuery(String(e.detail ?? ''));
    window.addEventListener('oxy:search', h);
    return () => window.removeEventListener('oxy:search', h);
  }, []);

  function toggleWear(name) {
    const cur = wear === 'all' ? [] : wear.split(',');
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    setWear(next.length && next.length < WEAR_TIERS.length ? next.join(',') : 'all');
  }

  function resetFilters() {
    setQuery('');
    window.history.replaceState(null, '', '/skinlar');
    window.dispatchEvent(new CustomEvent('oxy:search', { detail: '' }));
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
      ? { filters: 'Фильтры', price: 'Цена, сум', wear: 'Состояние (wear)', rarity: 'Цвета скинов', float: 'Float', more: 'Дополнительно', sort: 'Сортировка', found: 'Найдено', popular: 'Популярные', all: 'Все' }
      : { filters: 'Filtrlar', price: "Narx, so'm", wear: 'Holati (wear)', rarity: 'Skin ranglari', float: 'Float', more: "Qo'shimcha", sort: 'Saralash', found: 'Topildi', popular: 'Ommabop', all: 'Hammasi' };

  const sortOptions = [
    { value: 'price_asc', label: <SortLabel text={`${L.sort}: ${t('catalog_sort_price')}`} dir="asc" /> },
    { value: 'price_desc', label: <SortLabel text={`${L.sort}: ${t('catalog_sort_price')}`} dir="desc" /> },
    { value: 'count_desc', label: `${L.sort}: ${L.popular}` },
  ];
  const rarityList = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert', 'Extraordinary', 'Contraband'];
  const availOptions = [
    { value: 'all', label: t('avail_all') },
    { value: 'now', label: t('avail_now') },
    { value: 'later', label: t('avail_later') },
  ];
  const inputCls = 'w-full rounded-xl border border-line bg-ink/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40';
  const selectedWears = wear === 'all' ? [] : wear.split(',');
  const activeCount = (priceFrom || priceTo ? 1 : 0) + (wear !== 'all' ? 1 : 0) + (rarity !== 'all' ? 1 : 0) + (availability !== 'all' ? 1 : 0);
  const RARITY_SHORT = { 'Consumer Grade': 'Consumer', 'Industrial Grade': 'Industrial', 'Mil-Spec Grade': 'Mil-Spec', Restricted: 'Restricted', Classified: 'Classified', Covert: 'Covert', Extraordinary: 'Extraordinary', Contraband: 'Contraband' };

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
    <section className="container-wide pb-8 pt-4">
      {/* kategoriyalar */}
      <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto border-y border-line px-5 py-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:border-x-0 sm:px-0">
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

        {/* CHAP: FILTRLAR — hammasi ochiq, akkordeonsiz */}
        <aside className={`card filters-aside w-full flex-none overflow-hidden p-0 lg:block lg:w-[300px] ${filtersOpen ? 'block' : 'hidden'}`}>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <span className="flex items-center gap-2.5 text-lg font-semibold">
              <SlidersHorizontal className="h-5 w-5" />
              {L.filters}
              {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-ink">{activeCount}</span>}
            </span>
            {activeCount > 0 && (
              <button onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white">
                <RotateCw className="h-3.5 w-3.5" strokeWidth={2} />
                {t('catalog_reset')}
              </button>
            )}
          </div>

          <div className="space-y-6 border-t border-line px-5 py-5">
            <div>
              <div className="label mb-2.5">{L.price}</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" inputMode="numeric" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder={t('catalog_price_from')} className={inputCls} />
                <input type="number" inputMode="numeric" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder={t('catalog_price_to')} className={inputCls} />
              </div>
            </div>

            <div>
              <div className="label mb-2.5">{L.wear}</div>
              {wearChips}
              <div className="mt-2 text-[11px] leading-snug text-muted">
                {selectedWears.length ? selectedWears.join(' · ') : WEAR_TIERS.map((x) => x.key + ' ' + x.name).join(' · ')}
              </div>
            </div>

            <div>
              <div className="label mb-2.5">{L.rarity}</div>
              <div className="flex flex-wrap gap-1.5">
                {rarityList.map((r) => {
                  const active = rarity === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRarity(active ? 'all' : r)}
                      aria-pressed={active}
                      style={{
                        borderColor: active ? RARITY_DOT[r] : `${RARITY_DOT[r]}66`,
                        background: active ? `${RARITY_DOT[r]}33` : `${RARITY_DOT[r]}12`,
                        color: RARITY_DOT[r],
                        boxShadow: active ? `0 0 12px ${RARITY_DOT[r]}55` : 'none',
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:brightness-125 ${active ? '' : 'opacity-80 hover:opacity-100'}`}
                    >
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: RARITY_DOT[r], boxShadow: `0 0 6px ${RARITY_DOT[r]}` }} />
                      {RARITY_SHORT[r]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="label mb-2.5">{t('catalog_avail')}</div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line p-1">
                {availOptions.map((o) => {
                  const active = availability === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setAvailability(o.value)}
                      aria-pressed={active}
                      className={`rounded-lg px-2 py-2 text-xs font-medium transition ${active ? 'bg-white/10 text-white' : 'text-white/65 hover:text-white'}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* O'NG: GRID */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-3 text-sm text-muted">
              {loading && !total ? '…' : `${total.toLocaleString('ru-RU')} ${L.found.toLowerCase()}`}
              <Link href="/balans" className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10">
                <Wallet className="h-3.5 w-3.5" />
                {t('nav_balance')}
              </Link>
            </span>
            <Select value={sort} onChange={setSort} options={sortOptions} />
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1700px]:grid-cols-5">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1700px]:grid-cols-5">
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
