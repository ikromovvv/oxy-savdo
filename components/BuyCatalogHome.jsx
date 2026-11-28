'use client';

import { pick } from '@/lib/i18n';
import { RotateCw, SlidersHorizontal, ChevronDown, SortLabel, X, Check } from './icons';
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
    window.history.replaceState(null, '', window.location.pathname);
    window.dispatchEvent(new CustomEvent('oxy:search', { detail: '' }));
    setWeaponType('all');
    setWear('all');
    setRarity('all');
    setAvailability('all');
    setPriceFrom('');
    setPriceTo('');
  }

  // mobil filtr oynasi ochiq bo'lsa orqa fon aylanmasin
  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const tabs = weaponTypeLabels.filter((w) => availableWeaponTypes.includes(w.slug));
  const hasMore = items.length < total;
  const L_EN = { filters: 'Filters', price: 'Price, UZS', wear: 'Wear', rarity: 'Skin colors', float: 'Float', more: 'More', sort: 'Sort', found: 'Found', popular: 'Popular', all: 'All', show: 'Show skins' };
  const L_OTHER = {
    en: L_EN,
    es: { filters: 'Filtros', price: 'Precio, UZS', wear: 'Desgaste', rarity: 'Colores de skin', float: 'Float', more: 'Más', sort: 'Ordenar', found: 'Encontrados', popular: 'Populares', all: 'Todo', show: 'Mostrar skins' },
    zh: { filters: '筛选', price: '价格（UZS）', wear: '磨损', rarity: '饰品颜色', float: '磨损值', more: '更多', sort: '排序', found: '找到', popular: '热门', all: '全部', show: '显示饰品' },
    tr: { filters: 'Filtreler', price: 'Fiyat, UZS', wear: 'Aşınma', rarity: 'Skin renkleri', float: 'Float', more: 'Daha fazla', sort: 'Sırala', found: 'Bulundu', popular: 'Popüler', all: 'Tümü', show: 'Skinleri göster' },
    kk: { filters: 'Сүзгілер', price: 'Баға, UZS', wear: 'Тозу', rarity: 'Скин түстері', float: 'Float', more: 'Тағы', sort: 'Сұрыптау', found: 'Табылды', popular: 'Танымал', all: 'Барлығы', show: 'Скиндерді көрсету' },
  };
  const L =
    lang !== 'uz' && lang !== 'ru'
      ? L_OTHER[lang] || L_EN
      : lang === 'ru'
      ? { filters: 'Фильтры', price: 'Цена, сум', wear: 'Состояние (wear)', rarity: 'Цвета скинов', float: 'Float', more: 'Дополнительно', sort: 'Сортировка', found: 'Найдено', popular: 'Популярные', all: 'Все', show: 'Показать скины' }
      : { filters: 'Filtrlar', price: "Narx, so'm", wear: 'Holati (wear)', rarity: 'Skin ranglari', float: 'Float', more: "Qo'shimcha", sort: 'Saralash', found: 'Topildi', popular: 'Ommabop', all: 'Hammasi', show: "Skinlarni ko'rsatish" };

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
  const inputCls = 'w-full rounded-xl border border-line bg-ink/40 px-3 py-2 text-[13px] outline-none placeholder:text-muted/60 focus:border-white/40';
  const selectedWears = wear === 'all' ? [] : wear.split(',');
  // mobil filtr oynasi uchun tez narx oraliqlari
  const quickRanges = [
    { label: '< 100K', from: '', to: '100000' },
    { label: '100K–1M', from: '100000', to: '1000000' },
    { label: '1M–10M', from: '1000000', to: '10000000' },
    { label: '10M+', from: '10000000', to: '' },
  ];
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
            className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition"
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
        {[{ slug: 'all', label: L.all }, ...tabs.map((w) => ({ slug: w.slug, label: pick(w, lang) }))].map((c) => {
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
        {/* CHAP: FILTRLAR — hammasi ochiq, akkordeonsiz */}
        <aside className="card filters-aside hidden w-full flex-none overflow-hidden p-0 lg:block lg:w-[280px]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex items-center gap-2 text-base font-semibold">
              <SlidersHorizontal className="h-4 w-4" />
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

          <div className="space-y-5 border-t border-line px-4 py-4">
            <div>
              <div className="label mb-2 !text-[10px]">{L.price}</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" inputMode="numeric" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder={t('catalog_price_from')} className={inputCls} />
                <input type="number" inputMode="numeric" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder={t('catalog_price_to')} className={inputCls} />
              </div>
            </div>

            <div>
              <div className="label mb-2 !text-[10px]">{L.wear}</div>
              {wearChips}
              <div className="mt-1.5 text-[10px] leading-snug text-muted">
                {selectedWears.length ? selectedWears.join(' · ') : WEAR_TIERS.map((x) => x.key + ' ' + x.name).join(' · ')}
              </div>
            </div>

            <div>
              <div className="label mb-2 !text-[10px]">{L.rarity}</div>
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
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition hover:brightness-125 ${active ? '' : 'opacity-80 hover:opacity-100'}`}
                    >
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: RARITY_DOT[r], boxShadow: `0 0 6px ${RARITY_DOT[r]}` }} />
                      {RARITY_SHORT[r]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="label mb-2 !text-[10px]">{t('catalog_avail')}</div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line p-1">
                {availOptions.map((o) => {
                  const active = availability === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setAvailability(o.value)}
                      aria-pressed={active}
                      className={`rounded-lg px-1.5 py-1.5 text-[11px] font-medium transition ${active ? 'bg-white/10 text-white' : 'text-white/65 hover:text-white'}`}
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
          {/* mobil: [Filtrlar] [Saralash] ........ soni */}
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setFiltersOpen(true)}
              className="relative inline-flex h-11 flex-none items-center gap-2 rounded-xl border border-line bg-panel px-4 text-sm font-medium"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {L.filters}
              {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-ink">{activeCount}</span>}
            </button>
            <div className="min-w-0 flex-1">
              <Select value={sort} onChange={setSort} options={sortOptions} className="h-11 w-full justify-between" />
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted lg:hidden">
            <span>{loading && !total ? '…' : `${total.toLocaleString('ru-RU')} ${L.found.toLowerCase()}`}</span>
            <Link href="/balans" className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-2.5 py-1 font-medium text-accent">
              <Wallet className="h-3.5 w-3.5" />
              {t('nav_balance')}
            </Link>
          </div>

          {/* kompyuter: soni + Balans havolasi, o'ngda saralash */}
          <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
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
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4 min-[1700px]:grid-cols-5">
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
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4 min-[1700px]:grid-cols-5">
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

      {/* MOBIL FILTR OYNASI (pastdan chiqadigan sheet): checkbox'lar, tez narx oraliqlari, "Tozalash" va "Skinlarni ko'rsatish: N" */}
      <div className={`fixed inset-0 z-[70] lg:hidden ${filtersOpen ? '' : 'pointer-events-none'}`} aria-hidden={!filtersOpen}>
        <div onClick={() => setFiltersOpen(false)} className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${filtersOpen ? 'opacity-100' : 'opacity-0'}`} />
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl border border-line bg-ink transition-transform duration-300 ease-out ${filtersOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="mx-auto mt-2 h-1 w-10 flex-none rounded-full bg-white/20" aria-hidden="true" />
          <div className="flex flex-none items-center justify-between px-5 pb-2 pt-3">
            <h2 className="text-lg font-semibold">{L.filters}</h2>
            <button onClick={() => setFiltersOpen(false)} aria-label="close" className="grid h-9 w-9 place-items-center rounded-full border border-line text-white/70">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="admin-scroll min-h-0 flex-1 overflow-y-auto border-t border-line">
            {/* narx */}
            <div className="border-b border-line px-5 py-4">
              <div className="label mb-2.5">{L.price}</div>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="numeric" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder={t('catalog_price_from')} className={inputCls} />
                <span className="text-muted">—</span>
                <input type="number" inputMode="numeric" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder={t('catalog_price_to')} className={inputCls} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickRanges.map((r) => {
                  const active = priceFrom === r.from && priceTo === r.to;
                  return (
                    <button
                      key={r.label}
                      onClick={() => {
                        setPriceFrom(active ? '' : r.from);
                        setPriceTo(active ? '' : r.to);
                      }}
                      aria-pressed={active}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${active ? 'bg-white/15 text-white' : 'bg-white/[0.05] text-white/70'}`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* holati */}
            <div className="border-b border-line px-5 py-4">
              <div className="label mb-2">{L.wear}</div>
              {WEAR_TIERS.map((tier) => {
                const on = selectedWears.includes(tier.name);
                return (
                  <button key={tier.key} onClick={() => toggleWear(tier.name)} aria-pressed={on} className="flex w-full items-center gap-3 py-2.5 text-left text-[15px] text-white/85">
                    <span className={`grid h-5 w-5 flex-none place-items-center rounded-md border ${on ? 'border-accent bg-accent text-ink' : 'border-white/30'}`}>
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="font-semibold" style={{ color: TIER_COLOR[tier.key] }}>{tier.key}</span>
                    <span className="text-white/70">{tier.name}</span>
                  </button>
                );
              })}
            </div>

            {/* skin ranglari */}
            <div className="border-b border-line px-5 py-4">
              <div className="label mb-2">{L.rarity}</div>
              {rarityList.map((r) => {
                const on = rarity === r;
                return (
                  <button key={r} onClick={() => setRarity(on ? 'all' : r)} aria-pressed={on} className="flex w-full items-center gap-3 py-2.5 text-left text-[15px] text-white/85">
                    <span className={`grid h-5 w-5 flex-none place-items-center rounded-md border ${on ? 'border-accent bg-accent text-ink' : 'border-white/30'}`}>
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: RARITY_DOT[r], boxShadow: `0 0 6px ${RARITY_DOT[r]}` }} />
                    <span>{RARITY_SHORT[r]}</span>
                  </button>
                );
              })}
            </div>

            {/* mavjudlik */}
            <div className="px-5 py-4">
              <div className="label mb-2.5">{t('catalog_avail')}</div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line p-1">
                {availOptions.map((o) => {
                  const active = availability === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setAvailability(o.value)}
                      aria-pressed={active}
                      className={`rounded-lg px-1.5 py-2.5 text-xs font-medium transition ${active ? 'bg-white/10 text-white' : 'text-white/65'}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-none gap-3 border-t border-line bg-ink px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button onClick={resetFilters} disabled={activeCount === 0} className="btn-ghost flex-none px-5 disabled:opacity-40">
              {t('catalog_reset')}
            </button>
            <button onClick={() => setFiltersOpen(false)} className="btn-primary flex-1">
              {L.show}: {loading && !total ? '…' : total.toLocaleString('ru-RU')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
