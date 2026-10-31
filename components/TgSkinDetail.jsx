'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Send, ShoppingCart } from './icons';
import { useStore } from './StoreProvider';
import { WearBar } from './SkinCard';
import { rarityRgb } from '@/lib/skinMeta';
import { formatPrice } from '@/lib/products';

function Row({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-3 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

// Telegram skinining alohida sahifasi (karta profili).
export default function TgSkinDetail({ item: p }) {
  const { t, add, items, setCartOpen } = useStore();
  const inCart = items.some((x) => x.id === p.id);
  const sold = p.status === 'sold';
  const color = p.rarityColor || '#ffffff';
  const rgb = rarityRgb(color);
  const title = `${p.stattrak ? 'StatTrak™ ' : ''}${p.name}`;
  const imgRef = useRef(null);

  // Sahifa serverda chizilgani uchun rasm xatosi gidratsiyadan oldin bo'lishi mumkin — shuni qayta tekshiramiz
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0 && p.fallbackImage && el.dataset.fb !== '1') {
      el.dataset.fb = '1';
      el.src = p.fallbackImage;
      el.className = el.className.replace('object-cover', 'object-contain p-4');
    }
  }, [p.fallbackImage]);

  function addToCart() {
    if (inCart) return setCartOpen(true);
    add({
      id: p.id,
      kind: 'tgskin',
      name: title,
      price: p.priceUzs,
      image: p.image,
      wear: p.qualityName || p.quality,
    });
  }

  return (
    <section className="container-site max-w-5xl py-10">
      <Link
        href="/telegram-skinlar"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        {t('tg_title')}
      </Link>

      <div className="mt-5 grid gap-6 md:grid-cols-[1.15fr_1fr]">
        {/* rasm */}
        <div
          className="relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md"
          style={{
            borderColor: `rgba(${rgb}, 0.35)`,
            background: 'linear-gradient(180deg, rgba(24,24,26,0.7) 0%, rgba(18,18,20,0.55) 100%)',
            boxShadow: `0 0 28px rgba(${rgb}, 0.18)`,
          }}
        >
          <span className="absolute inset-x-0 top-0 z-10 h-[2px]" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: color }}
          />
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/5 bg-black/40">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={p.image}
                alt={title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (p.fallbackImage && el.dataset.fb !== '1') {
                    el.dataset.fb = '1';
                    el.src = p.fallbackImage;
                    el.className = el.className.replace('object-cover', 'object-contain p-4');
                  }
                }}
                className="h-full w-full object-cover"
              />
            ) : p.fallbackImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.fallbackImage} alt={title} className="h-full w-full object-contain p-4" />
            ) : (
              <div className="grid h-full w-full place-items-center px-4 text-center text-sm font-semibold text-white/60">{title}</div>
            )}
            {sold && (
              <span className="absolute inset-0 grid place-items-center bg-black/55">
                <span className="-rotate-12 rounded-md border-2 border-rose-400/80 px-4 py-1.5 text-2xl font-extrabold tracking-widest text-rose-300">
                  {t('tg_sold')}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ma'lumotlar */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {p.rarity && (
              <span
                className="rounded-md px-2 py-0.5 font-semibold"
                style={{ background: `rgba(${rgb}, 0.16)`, color }}
              >
                {p.rarity}
              </span>
            )}
            {p.stattrak && (
              <span className="rounded-md border border-line bg-black/50 px-2 py-0.5 font-bold uppercase tracking-wide">
                StatTrak&trade;
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{p.name}</h1>

          {p.quality && <WearBar wear={p.quality} minFloat={p.minFloat} maxFloat={p.maxFloat} value={p.float} />}

          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4">
            <Row label={t('catalog_wear')}>{p.qualityName}</Row>
            <Row label="Float">{p.float != null ? <span className="font-mono">{p.float}</span> : null}</Row>
            <Row label="Unban">
              {p.noBan ? (
                <span className="font-semibold text-emerald-300">{t('tg_noban')}</span>
              ) : (
                p.unban && <span className="font-semibold text-amber-300">{p.unban}</span>
              )}
            </Row>
          </div>

          <div className="mt-5">
            <div className="text-3xl font-bold leading-none">
              {p.priceUzs != null ? formatPrice(p.priceUzs) : sold ? '—' : t('tg_price_ask')}
            </div>
            {p.priceUsdShown != null && !sold && (
              <div className="mt-1 text-sm text-muted">{p.usdApprox ? '≈ ' : ''}${p.priceUsdShown}</div>
            )}
          </div>

          {sold ? (
            <div className="mt-5 rounded-xl border border-line py-3 text-center text-sm font-semibold text-muted">
              {t('tg_sold')}
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2.5">
              {p.priceUzs != null && (
                <button
                  type="button"
                  onClick={addToCart}
                  className="btn-cta flex w-full items-center justify-center gap-2 py-3.5 text-sm"
                >
                  {inCart ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />}
                  {inCart ? t('tg_in_cart') : t('tg_add')}
                </button>
              )}
              <a
                href={p.buyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                <Send className="h-4 w-4" strokeWidth={2.25} />
                {t('tg_buy')}
              </a>
              <a
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-1 text-xs text-muted transition hover:text-white"
              >
                {t('tg_view_post')}
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
