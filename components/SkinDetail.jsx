'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { ProductMedia } from './ProductCard';
import SkinCard from './SkinCard';
import Skin3DModal from './Skin3DModal';
import Select from './Select';
import { cachedListings, fetchListings, prefetchSkin, prefetchListings } from '@/lib/skinClientCache';
import { Eye, Box, X, Zap, Clock, Copy, Check, ShoppingCart, ChevronLeft, ChevronRight, Heart } from './icons';
import { formatPrice, weaponTypes } from '@/lib/products';
import { rarityInfo, rarityRgb, WEAR_TIERS, WEAR_GRADIENT, wearInfo } from '@/lib/skinMeta';

// Skin sahifasi (LIS-SKINS uslubida): rasm + "O'yin ichida ko'rish", spetsifikatsiya, narx paneli,
// wear tablari, filtrli takliflar jadvali (har nusxa — alohida float), "Sizga yoqishi mumkin", tavsif.

const TIER_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };
const WEAR_ORDER = WEAR_TIERS.map((w) => w.name);

const DICT = {
  uz: {
    home: 'Bosh sahifa', skins: 'Skinlar', copy: 'Nomini nusxalash', copied: 'Nusxalandi',
    regular: 'Oddiy', stattrak: 'StatTrak™', souvenir: 'Souvenir',
    float: 'Float', type: 'Turi', rarity: 'Rariteti', exterior: 'Holati', pattern: 'Naqsh (seed)', stock: 'Soni',
    inspect: "O'yin ichida ko'rish", inspectNone: "Inspect havolasi yo'q", view3d: "3D ko'rish", full3d: "To'liq ekran", exitFull3d: 'Kichraytirish', close: 'Yopish', loading3d: 'Yuklanmoqda…',
    inspectHint: "CS2 ochiladi va skin o'yin ichida ko'rsatiladi (Steam o'rnatilgan bo'lishi kerak)",
    stickers: 'Stikerlar', instant: 'Tezkor', slow: '12 soatgacha', slowFull: 'Sekin (12 soatgacha)',
    addToCart: 'Savatga', added: "Qo'shildi", buyNow: 'Sotib olish',
    offers: 'ta taklif', offersFrom: 'dan', offer1: 'taklif',
    delivery: 'Yetkazish', all: 'Hammasi', fast: 'Tezkor',
    from: 'dan', to: 'gacha', floatFrom: 'Float dan', floatTo: 'Float gacha', priceFrom: 'Narx dan', priceTo: 'Narx gacha',
    price: 'Narx', actions: '', noOffers: "Bu filtr bo'yicha taklif topilmadi.", loading: 'Yuklanmoqda...',
    err: "Takliflar ro'yxatini yuklab bo'lmadi.", reset: 'Tozalash',
    also: 'Sizga yoqishi mumkin', description: 'Tavsif', whatToCheck: 'Sotib olishdan oldin tekshiring',
    favorite: 'Sevimli', noFloat: 'Float aniqlanmagan',
  },
  ru: {
    home: 'Главная', skins: 'Скины', copy: 'Копировать название', copied: 'Скопировано',
    regular: 'Обычный', stattrak: 'StatTrak™', souvenir: 'Сувенир',
    float: 'Float', type: 'Тип', rarity: 'Редкость', exterior: 'Состояние', pattern: 'Паттерн (seed)', stock: 'Количество',
    inspect: 'Осмотреть в игре', inspectNone: 'Нет inspect-ссылки', view3d: '3D просмотр', full3d: 'На весь экран', exitFull3d: 'Свернуть', close: 'Закрыть', loading3d: 'Загрузка…',
    inspectHint: 'Откроется CS2 и покажет скин в игре (нужен установленный Steam)',
    stickers: 'Стикеры', instant: 'Мгновенно', slow: 'до 12 часов', slowFull: 'Медленно (до 12 часов)',
    addToCart: 'В корзину', added: 'Добавлено', buyNow: 'Купить',
    offers: 'предложений', offersFrom: 'от', offer1: 'предложение',
    delivery: 'Доставка', all: 'Все', fast: 'Мгновенная',
    from: 'от', to: 'до', floatFrom: 'Float от', floatTo: 'Float до', priceFrom: 'Цена от', priceTo: 'Цена до',
    price: 'Цена', actions: '', noOffers: 'По этому фильтру предложений нет.', loading: 'Загрузка...',
    err: 'Не удалось загрузить предложения.', reset: 'Сбросить',
    also: 'Вам может понравиться', description: 'Описание', whatToCheck: 'Проверьте перед покупкой',
    favorite: 'В избранное', noFloat: 'Float не определён',
  },
};

// 0..1 float uchun rangli chiziq + marker
function FloatBar({ value, className = '' }) {
  const pos = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) * 100 : null;
  return (
    <div className={`relative ${className}`}>
      <div className="h-1.5 w-full rounded-full" style={{ background: WEAR_GRADIENT }} />
      {pos != null && (
        <span
          className="absolute -top-1 h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[6px] border-x-transparent border-t-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          style={{ left: `${pos}%` }}
        />
      )}
    </div>
  );
}

const fmtUsd = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SkinDetail({ product, related = [], variants = [], switching = false, onSelectVariant }) {
  const { lang, add, setCartOpen, favorites, toggleFavorite } = useStore();
  const D = DICT[lang] || DICT.uz;

  // ---- nusxalar (LIS) ----
  const isListingPage = Boolean(product.listingId);
  const [lst, setLst] = useState({ loading: !isListingPage, items: [], supported: !isListingPage, error: false });
  useEffect(() => {
    if (isListingPage) return undefined;
    let alive = true;
    const done = (d) => alive && setLst({ loading: false, items: d.listings || [], supported: d.supported !== false, error: Boolean(d.error) });
    const hit = cachedListings(product.id);
    if (hit) {
      done(hit); // keshda bor — jadval darhol
    } else {
      // faqat takliflar jadvali skeleton ko'rsatadi; sahifaning qolgan qismi joyida turadi
      setLst((s) => ({ ...s, loading: true, items: [], error: false }));
      fetchListings(product.id).then(done).catch(() => alive && setLst({ loading: false, items: [], supported: true, error: true }));
    }
    return () => {
      alive = false;
    };
  }, [product.id, isListingPage]);

  // boshqa variantlarning ma'lumotini bo'sh vaqtda oldindan yuklaymiz (almashish oniy bo'lsin)
  useEffect(() => {
    const ids = variants.map((v) => v.id).filter((id) => id !== product.id);
    if (!ids.length) return undefined;
    const timer = setTimeout(() => ids.forEach(prefetchSkin), 700);
    return () => clearTimeout(timer);
  }, [variants, product.id]);

  // cs2shop nusxa sahifasi: bitta nusxa
  const baseListings = useMemo(() => {
    if (!isListingPage) return lst.items;
    return [{
      id: product.listingId, price: product.price, priceUsd: product.priceUsd ?? null, floatValue: product.floatValue ?? null,
      paintSeed: product.paintSeed ?? null, inspectLink: product.inspectLink || null, stickers: [], instant: !product.availableAfter,
    }];
  }, [isListingPage, lst.items, product]);

  // ---- filtrlar / saralash ----
  const [f, setF] = useState({ delivery: 'all', floatFrom: '', floatTo: '', priceFrom: '', priceTo: '' });
  const [sort, setSort] = useState({ key: 'price', dir: 'asc' });
  const [selectedId, setSelectedId] = useState(null);
  const [show3d, setShow3d] = useState(null); // 3D ko'rgich uchun inspect havola
  const [modalId, setModalId] = useState(null); // nusxa tafsilotlari oynasi
  useEffect(() => {
    setSelectedId(null);
    setModalId(null);
  }, [product.id]);

  // variant tablari: oddiy bosish — sahifa qayta yuklanmaydi; Ctrl/Cmd+bosish — yangi tabda
  const pickVariant = (e, id) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || !onSelectVariant) return;
    e.preventDefault();
    onSelectVariant(id);
  };
  const hoverVariant = (id) => {
    prefetchSkin(id);
    prefetchListings(id);
  };

  const shown = useMemo(() => {
    const ff = parseFloat(f.floatFrom), ft = parseFloat(f.floatTo), pf = parseFloat(f.priceFrom), pt = parseFloat(f.priceTo);
    let list = baseListings.filter((l) => {
      if (f.delivery === 'instant' && !l.instant) return false;
      if (f.delivery === 'slow' && l.instant) return false;
      if (Number.isFinite(ff) && !(l.floatValue != null && l.floatValue >= ff)) return false;
      if (Number.isFinite(ft) && !(l.floatValue != null && l.floatValue <= ft)) return false;
      if (Number.isFinite(pf) && l.price < pf) return false;
      if (Number.isFinite(pt) && l.price > pt) return false;
      return true;
    });
    const k = sort.key === 'float' ? (l) => l.floatValue ?? 9 : (l) => l.price;
    list = [...list].sort((a, b) => (k(a) - k(b)) * (sort.dir === 'asc' ? 1 : -1));
    return list;
  }, [baseListings, f, sort]);

  const selected = shown.find((l) => l.id === selectedId) || shown[0] || baseListings.find((l) => l.id === selectedId) || null;

  const modalOffer = modalId != null ? baseListings.find((l) => l.id === modalId) || null : null;

  // ---- tanlangan nusxa / narx ----
  const price = selected?.price ?? product.price;
  const priceUsd = selected?.priceUsd ?? product.priceUsd ?? null;
  const rarity = rarityInfo(product);
  const rgb = rarityRgb(rarity.color);
  const typeLabel = weaponTypes.find((w) => w.slug === product.weaponType)?.[lang];
  const weapon = product.name.split(' | ')[0];
  const fav = favorites.some((x) => x.id === product.id);
  const wInfo = wearInfo(product.wear);

  const [justAdded, setJustAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  const toCartItem = (l) =>
    l
      ? {
          id: isListingPage ? product.id : `lis-${l.id}`, name: product.name, fullName: product.fullName, price: l.price, priceUsd: l.priceUsd,
          image: product.image, wear: product.wear, weaponType: product.weaponType, category: 'skins',
          listingId: String(l.id), lisId: isListingPage ? undefined : l.id, floatValue: l.floatValue,
        }
      : product;

  const addSelected = (open) => {
    add(toCartItem(selected));
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    if (open) setCartOpen(true);
  };

  const copyName = () => {
    try {
      navigator.clipboard?.writeText(product.fullName || product.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard bo'lmasa — e'tiborsiz */
    }
  };

  // ---- variantlar (wear va StatTrak) ----
  const sameKind = variants.filter((v) => v.stattrak === product.stattrak && v.souvenir === product.souvenir);
  const wearTabs = [...sameKind].sort((a, b) => WEAR_ORDER.indexOf(a.wear) - WEAR_ORDER.indexOf(b.wear));
  const stOther = variants.find((v) => v.wear === product.wear && v.souvenir === product.souvenir && v.stattrak !== product.stattrak);
  const regularV = product.stattrak ? stOther : variants.find((v) => v.id === product.id);
  const stV = product.stattrak ? variants.find((v) => v.id === product.id) : stOther;

  // ---- tavsif ----
  const range = wInfo ? `${wInfo.min.toFixed(2)}–${wInfo.max.toFixed(2)}` : null;
  const cheapest = baseListings.length ? baseListings.reduce((m, l) => (l.price < m.price ? l : m), baseListings[0]) : null;
  const countOffers = isListingPage ? 1 : lst.items.length || product.count || 0;
  const minP = cheapest?.price ?? product.price;
  const minUsd = cheapest?.priceUsd ?? product.priceUsd;
  const desc =
    lang === 'ru'
      ? [
          `${product.fullName} — скин для ${weapon}${typeLabel ? ` (${typeLabel})` : ''}, редкость ${rarity.label}.${wInfo ? ` Состояние ${product.wear}: float ${range}.` : ''}${product.minFloat != null ? ` Float самого скина: ${product.minFloat}–${product.maxFloat}.` : ''}`,
          `Сейчас на OXY SAVDO ${countOffers} предложений, самое дешёвое — ${formatPrice(minP)}${minUsd ? ` (${fmtUsd(minUsd)})` : ''}.`,
        ]
      : [
          `${product.fullName} — ${weapon} uchun ${rarity.label} rariteti skin${typeLabel ? ` (${typeLabel})` : ''}.${wInfo ? ` Holati ${product.wear}: float ${range}.` : ''}${product.minFloat != null ? ` Skinning o'z float diapazoni: ${product.minFloat}–${product.maxFloat}.` : ''}`,
          `Hozir OXY SAVDO'da ${countOffers} ta taklif bor, eng arzoni — ${formatPrice(minP)}${minUsd ? ` (${fmtUsd(minUsd)})` : ''}.`,
        ];
  const checks =
    lang === 'ru'
      ? ['Float и паттерн (seed) — у каждого экземпляра свои', 'Стикеры на экземпляре', 'Кнопка «Осмотреть в игре» откроет скин в CS2', 'Нужна ссылка на обмен (Trade URL), Steam Guard включён']
      : ["Float va naqsh (seed) — har bir nusxada o'zi", 'Nusxadagi stikerlar', "\"O'yin ichida ko'rish\" tugmasi skinni CS2 ichida ochadi", "Steam Trade URL kerak, Steam Guard yoqilgan bo'lsin"];

  // ---- "Sizga yoqishi mumkin" karuseli ----
  const railRef = useRef(null);
  const scrollRail = (dir) => railRef.current?.scrollBy({ left: dir * 560, behavior: 'smooth' });

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const sortMark = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const inputCls = 'w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40';
  const showOffers = lst.supported || isListingPage;
  const filtersActive = f.delivery !== 'all' || f.floatFrom || f.floatTo || f.priceFrom || f.priceTo;

  return (
    <>
      {modalOffer && (
        <OfferModal
          product={product}
          offer={modalOffer}
          rarity={rarity}
          typeLabel={typeLabel}
          D={D}
          fav={fav}
          onFav={() => toggleFavorite(product)}
          onClose={() => setModalId(null)}
          on3d={(link) => setShow3d(link)}
          onAdd={() => add(toCartItem(modalOffer))}
          onBuy={() => {
            add(toCartItem(modalOffer));
            setModalId(null);
            setCartOpen(true);
          }}
        />
      )}
      {show3d && (
        <Skin3DModal
          inspectLink={show3d}
          title={product.fullName || product.name}
          closeLabel={D.close}
          loadingLabel={D.loading3d}
          fullLabel={D.full3d}
          exitFullLabel={D.exitFull3d}
          onClose={() => setShow3d(null)}
        />
      )}
      <section className={`container-site py-8 transition-opacity duration-200 ${switching ? 'opacity-60' : ''}`}>
        {/* sarlavha yo'li */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="breadcrumb">
          <Link href="/" className="hover:text-white">{D.home}</Link><span>›</span>
          <Link href="/skinlar" className="hover:text-white">{D.skins}</Link><span>›</span>
          {typeLabel && <><span>{typeLabel}</span><span>›</span></>}
          <span>{weapon}</span><span>›</span>
          <span className="text-white/80">{product.fullName || product.name}</span>
        </nav>

        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {product.stattrak && <span className="mr-2 text-base text-accent">StatTrak™</span>}
            {product.name}{product.wear ? ` (${product.wear})` : ''}
          </h1>
          <button onClick={copyName} title={copied ? D.copied : D.copy} aria-label={D.copy} className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-line text-white/70 transition hover:border-white/40 hover:text-white">
            {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* CHAP: rasm kartasi */}
          <div
            className="relative overflow-hidden rounded-2xl border p-4"
            style={{ borderColor: `rgba(${rgb},0.3)`, background: 'linear-gradient(180deg, rgba(22,28,38,0.7), rgba(14,14,16,0.85))', boxShadow: `0 0 24px rgba(${rgb},0.12)` }}
          >
            <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: rarity.color, boxShadow: `0 0 14px ${rarity.color}` }} aria-hidden="true" />
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[40%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl" style={{ background: rarity.color }} />

            <div className="relative flex items-center justify-between">
              {selected ? (
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${selected.instant ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-sky-400/40 bg-sky-400/10 text-sky-300'}`}>
                  {selected.instant ? <><Zap className="h-3.5 w-3.5" strokeWidth={2.5} />{D.instant}</> : <><Clock className="h-3.5 w-3.5" strokeWidth={2.5} />{D.slow}</>}
                </span>
              ) : <span />}
              <button onClick={() => toggleFavorite(product)} aria-label={D.favorite} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/40 text-base transition hover:bg-black/60">
                <Heart className={`h-4 w-4 ${fav ? 'fill-current text-accent' : 'text-white/70'}`} />
              </button>
            </div>

            <div className="relative mt-2">
              <ProductMedia product={product} priority className="aspect-[4/3] w-full rounded-xl" />
            </div>

            <div className="relative mt-3">
              {selected?.inspectLink ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShow3d(selected.inspectLink)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold uppercase tracking-wide transition hover:border-white/40 hover:bg-white/10"
                  >
                    <Box className="h-4 w-4" strokeWidth={2} />
                    {D.view3d}
                  </button>
                  <a href={selected.inspectLink} title={D.inspectHint} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold uppercase tracking-wide transition hover:border-white/40 hover:bg-white/10">
                    <Eye className="h-4 w-4" strokeWidth={2} />
                    {D.inspect}
                  </a>
                </div>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm text-muted">
                  <Eye className="h-4 w-4" strokeWidth={2} />
                  {D.inspectNone}
                </div>
              )}
            </div>
          </div>

          {/* O'NG: spetsifikatsiya + narx */}
          <div className="flex min-w-0 flex-col gap-4">
            {(regularV || stV) && (
              <div className="flex w-fit gap-1 rounded-xl border border-line bg-panel p-1 text-sm">
                {[[regularV, D.regular, !product.stattrak], [stV, D.stattrak, product.stattrak]].map(([v, label, active], i) => (
                  v && !active ? (
                    <Link key={i} href={`/mahsulot/${v.id}`} onClick={(e) => pickVariant(e, v.id)} onMouseEnter={() => hoverVariant(v.id)} onFocus={() => hoverVariant(v.id)} className="rounded-lg px-4 py-1.5 text-muted transition hover:text-white">{label}</Link>
                  ) : (
                    <span key={i} className={`rounded-lg px-4 py-1.5 ${active ? 'bg-white/10 text-white' : 'cursor-not-allowed text-muted/40'}`}>{label}</span>
                  )
                ))}
              </div>
            )}

            <dl className="card divide-y divide-line px-5 py-1 text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">{D.float}</dt>
                <dd className="flex min-w-0 items-center gap-4">
                  <FloatBar value={selected?.floatValue} className="hidden w-44 sm:block" />
                  <span className="font-mono text-white/90">{selected?.floatValue != null ? selected.floatValue.toFixed(12).replace(/0+$/, '') : '—'}</span>
                </dd>
              </div>
              <div className="flex justify-between py-3"><dt className="text-muted">{D.type}</dt><dd>{typeLabel || '—'}</dd></div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted">{D.rarity}</dt>
                <dd className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }} />{rarity.label}</dd>
              </div>
              <div className="flex justify-between py-3"><dt className="text-muted">{D.exterior}</dt><dd>{product.wear || '—'}</dd></div>
              {selected?.paintSeed != null && (
                <div className="flex justify-between py-3"><dt className="text-muted">{D.pattern}</dt><dd className="font-mono">{selected.paintSeed}</dd></div>
              )}
              {!isListingPage && Number.isFinite(product.count) && (
                <div className="flex justify-between py-3"><dt className="text-muted">{D.stock}</dt><dd>{product.count}</dd></div>
              )}
            </dl>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 border-l-[3px] bg-white/[0.03] p-4" style={{ borderLeftColor: rarity.color }}>
              <div className="mr-auto">
                <div className="text-3xl font-bold leading-tight tracking-tight">{formatPrice(price)}</div>
                {priceUsd != null && <div className="text-sm text-muted">{fmtUsd(priceUsd)}</div>}
              </div>
              <button onClick={() => (selected ? addSelected(false) : (add(product, 1), setJustAdded(true), setTimeout(() => setJustAdded(false), 1200)))} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold transition hover:border-white/40">
                <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                {justAdded ? D.added : D.addToCart}
              </button>
              <button onClick={() => (selected ? addSelected(true) : (add(product, 1), setCartOpen(true)))} className="btn-primary inline-flex items-center gap-2">
                <Zap className="h-4 w-4" strokeWidth={2.5} />
                {D.buyNow}
              </button>
            </div>
          </div>
        </div>

        {/* wear tablari */}
        {wearTabs.length > 1 && (
          <div className="mt-6 flex overflow-x-auto rounded-2xl border border-line bg-panel/60 no-scrollbar">
            {wearTabs.map((v) => {
              const key = wearInfo(v.wear)?.key;
              const color = TIER_COLOR[key] || '#fff';
              const active = v.id === product.id;
              return (
                <Link key={v.id} href={`/mahsulot/${v.id}`} onClick={(e) => pickVariant(e, v.id)} onMouseEnter={() => hoverVariant(v.id)} onFocus={() => hoverVariant(v.id)} className={`min-w-[170px] flex-1 px-5 py-4 transition ${active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                  <div className="text-sm font-medium" style={{ color }}>{v.wear}</div>
                  <div className="mt-1 text-xs text-muted">{v.count ? `${v.count} ${D.offers}` : D.offer1} · {formatPrice(v.price)}</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* TAKLIFLAR JADVALI */}
      {showOffers && (
        <section className="container-site pb-8 pt-2">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {lst.loading || switching ? D.loading : `${shown.length}${shown.length !== baseListings.length ? ` / ${baseListings.length}` : ''} ${D.offers}`}
          </h2>

          {!isListingPage && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Select
                value={f.delivery}
                onChange={(v) => setF({ ...f, delivery: v })}
                options={[
                  { value: 'all', label: `${D.delivery}: ${D.all}` },
                  { value: 'instant', label: `${D.delivery}: ${D.fast}` },
                  { value: 'slow', label: `${D.delivery}: ${D.slow}` },
                ]}
              />
              {[
                ['float', D.float, 'floatFrom', 'floatTo', '0.001', 'decimal'],
                ['price', D.price, 'priceFrom', 'priceTo', '1', 'numeric'],
              ].map(([key, label, kFrom, kTo, step, mode]) => (
                <div key={key} className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-panel transition focus-within:border-white/40 sm:flex-none">
                  <span className="flex-none border-r border-line px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
                  <input type="number" step={step} inputMode={mode} placeholder={D.from} aria-label={`${label} ${D.from}`} value={f[kFrom]} onChange={(e) => setF({ ...f, [kFrom]: e.target.value })} className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 sm:w-24" />
                  <span className="text-muted/50">—</span>
                  <input type="number" step={step} inputMode={mode} placeholder={D.to} aria-label={`${label} ${D.to}`} value={f[kTo]} onChange={(e) => setF({ ...f, [kTo]: e.target.value })} className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 sm:w-24" />
                </div>
              ))}
              {filtersActive && (
                <button onClick={() => setF({ delivery: 'all', floatFrom: '', floatTo: '', priceFrom: '', priceTo: '' })} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                  {D.reset}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-line">

            <div className="admin-scroll max-h-[min(70vh,620px)] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-10 hidden grid-cols-[36px_minmax(170px,1.2fr)_minmax(0,1fr)_150px_210px] items-center gap-4 bg-panel px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted md:grid">
              <span />
              <button onClick={() => toggleSort('float')} className="text-left hover:text-white">{D.float}{sortMark('float')}</button>
              <span>{D.pattern}</span>
              <button onClick={() => toggleSort('price')} className="text-right hover:text-white">{D.price}{sortMark('price')}</button>
              <span />
            </div>
            {lst.loading || switching ? (
              <div className="space-y-px">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-white/[0.04]" />)}</div>
            ) : lst.error && !baseListings.length ? (
              <div className="p-6 text-sm text-muted">{D.err}</div>
            ) : shown.length === 0 ? (
              <div className="p-6 text-sm text-muted">{D.noOffers}</div>
            ) : (
              <ul className="divide-y divide-line">
                {shown.map((l) => {
                  const active = selected?.id === l.id;
                  return (
                    <li
                      key={l.id}
                      onClick={() => {
                        setSelectedId(l.id);
                        setModalId(l.id);
                      }}
                      className={`grid cursor-pointer items-center gap-x-4 gap-y-2 px-4 py-3 transition md:grid-cols-[36px_minmax(170px,1.2fr)_minmax(0,1fr)_150px_210px] ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <span className={`hidden md:grid ${l.instant ? 'text-emerald-300' : 'text-sky-300'}`} title={l.instant ? D.instant : D.slowFull}>
                        {l.instant ? <Zap className="h-4 w-4" strokeWidth={2.5} /> : <Clock className="h-4 w-4" strokeWidth={2.5} />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`md:hidden ${l.instant ? 'text-emerald-300' : 'text-sky-300'}`}>{l.instant ? <Zap className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />}</span>
                          <span className="font-mono text-sm text-white/90">{l.floatValue != null ? l.floatValue.toFixed(7) : '—'}</span>
                        </div>
                        <FloatBar value={l.floatValue} className="mt-1.5 w-full max-w-[220px]" />
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted">
                        {l.paintSeed != null && <span className="rounded-md border border-line px-2 py-1 font-mono text-white/85">#{l.paintSeed}</span>}
                        {l.stickers?.map((s, i) => s.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={s.image} alt={s.name} title={s.name} loading="lazy" className="h-7 w-9 rounded object-contain" />
                        ) : null)}
                      </div>
                      <div className="md:text-right">
                        <div className="text-base font-bold leading-tight">{formatPrice(l.price)}</div>
                        {l.priceUsd != null && <div className="text-[11px] text-muted">{fmtUsd(l.priceUsd)}</div>}
                      </div>
                      <div className="flex items-center gap-2 md:justify-end" onClick={(e) => e.stopPropagation()}>
                        {l.inspectLink && (
                          <a href={l.inspectLink} title={D.inspectHint} aria-label={D.inspect} className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 text-white/80 transition hover:border-white/40 hover:text-white">
                            <Eye className="h-4 w-4" strokeWidth={2} />
                          </a>
                        )}
                        <button onClick={() => { setSelectedId(l.id); add(toCartItem(l)); setCartOpen(true); }} className="btn-primary !px-4 !py-2 text-xs">
                          <Zap className="mr-1 inline h-3.5 w-3.5" strokeWidth={2.5} />{D.buyNow}
                        </button>
                        <button onClick={() => { add(toCartItem(l)); }} aria-label={D.addToCart} className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 text-white/80 transition hover:border-white/40 hover:text-white">
                          <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            </div>
          </div>
        </section>
      )}

      {/* SIZGA YOQISHI MUMKIN */}
      {related.length > 0 && (
        <section className="container-site py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{D.also}</h2>
            <div className="flex gap-2">
              <button onClick={() => scrollRail(-1)} aria-label="prev" className="grid h-9 w-9 place-items-center rounded-full border border-line transition hover:border-white/40"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => scrollRail(1)} aria-label="next" className="grid h-9 w-9 place-items-center rounded-full border border-line transition hover:border-white/40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={railRef} className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {related.map((p) => (
              <div key={p.id} className="w-[250px] flex-none snap-start sm:w-[270px]"><SkinCard product={p} /></div>
            ))}
          </div>
        </section>
      )}

      {/* TAVSIF */}
      <section className="container-site pb-14 pt-4">
        <h2 className="text-xl font-semibold tracking-tight">{D.description}</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-white/70">
          {desc.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <h3 className="mt-6 text-base font-semibold">{D.whatToCheck}</h3>
        <ul className="mt-2 max-w-3xl list-disc space-y-1 pl-5 text-sm text-white/70">
          {checks.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>
    </>
  );
}

// Nusxa tafsilotlari oynasi (LIS uslubida): rasm, yetkazish, float, naqsh, stikerlar, narx, sotib olish
function OfferModal({ product, offer, rarity, typeLabel, D, fav, onFav, onClose, on3d, onAdd, onBuy }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('[data-3d-open]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const stickers = (offer.stickers || []).filter((s) => s.image);

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={product.fullName || product.name}>
      <div onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-panel p-4 shadow-[0_20px_80px_rgba(0,0,0,0.65)] sm:p-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* CHAP: rasm */}
          <div className="flex flex-col">
            <div className="relative rounded-xl border border-white/10 bg-black/30 p-3" style={{ boxShadow: `inset 0 2px 0 ${rarity.color}55` }}>
              <div className={`absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${offer.instant ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-sky-400/40 bg-sky-400/10 text-sky-300'}`}>
                {offer.instant ? <Zap className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />}
                {offer.instant ? D.instant : D.slowFull}
              </div>
              <div className="absolute right-3 top-3 z-10 flex gap-2">
                {offer.inspectLink && (
                  <button onClick={() => on3d(offer.inspectLink)} aria-label={D.view3d} title={D.view3d} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/50 text-white/80 transition hover:bg-black/70 hover:text-white">
                    <Box className="h-4 w-4" />
                  </button>
                )}
                <button onClick={onFav} aria-label={D.favorite} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/50 transition hover:bg-black/70">
                  <Heart className={`h-4 w-4 ${fav ? 'fill-current text-accent' : 'text-white/70'}`} />
                </button>
              </div>
              <ProductMedia product={product} priority className="aspect-[4/3] w-full rounded-lg" />
            </div>
            {offer.inspectLink ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={offer.inspectLink} title={D.inspectHint} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-xs font-semibold uppercase tracking-wide transition hover:border-white/40 hover:bg-white/10 sm:text-sm">
                  <Eye className="h-4 w-4" strokeWidth={2} />
                  {D.inspect}
                </a>
                <button onClick={() => on3d(offer.inspectLink)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-xs font-semibold uppercase tracking-wide transition hover:border-white/40 hover:bg-white/10 sm:text-sm">
                  <Box className="h-4 w-4" strokeWidth={2} />
                  {D.view3d}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm text-muted">
                <Eye className="h-4 w-4" strokeWidth={2} />
                {D.inspectNone}
              </div>
            )}
          </div>

          {/* O'NG: tafsilotlar */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{product.fullName || product.name}</h3>
              <button onClick={onClose} aria-label={D.close} className="grid h-9 w-9 flex-none place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-4 divide-y divide-line text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">{D.float}</dt>
                <dd className="flex min-w-0 items-center gap-3">
                  <FloatBar value={offer.floatValue} className="hidden w-36 sm:block" />
                  <span className="font-mono text-white/90">{offer.floatValue != null ? offer.floatValue.toFixed(12).replace(/0+$/, '') : '—'}</span>
                </dd>
              </div>
              <div className="flex justify-between py-3"><dt className="text-muted">{D.type}</dt><dd>{typeLabel || '—'}</dd></div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted">{D.rarity}</dt>
                <dd className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }} />{rarity.label}</dd>
              </div>
              <div className="flex justify-between py-3"><dt className="text-muted">{D.exterior}</dt><dd>{product.wear || '—'}</dd></div>
              {offer.paintSeed != null && (
                <div className="flex justify-between py-3"><dt className="text-muted">{D.pattern}</dt><dd className="font-mono">{offer.paintSeed}</dd></div>
              )}
              {stickers.length > 0 && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-muted">{D.stickers}</dt>
                  <dd className="flex flex-wrap justify-end gap-1.5">
                    {stickers.map((s, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={s.image} alt={s.name} title={s.name} loading="lazy" className="h-9 w-auto object-contain" />
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-auto pt-5">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 border-l-[3px] bg-white/[0.03] p-4" style={{ borderLeftColor: rarity.color }}>
                <div className="mr-auto">
                  <div className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{formatPrice(offer.price)}</div>
                  {offer.priceUsd != null && <div className="text-sm text-muted">{fmtUsd(offer.priceUsd)}</div>}
                </div>
                <button
                  onClick={() => {
                    onAdd();
                    setAdded(true);
                    setTimeout(() => setAdded(false), 1200);
                  }}
                  aria-label={D.addToCart}
                  title={added ? D.added : D.addToCart}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 text-white/85 transition hover:border-white/40 hover:text-white"
                >
                  {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" strokeWidth={2} />}
                </button>
                <button onClick={onBuy} className="btn-primary inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" strokeWidth={2.5} />
                  {D.buyNow}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
