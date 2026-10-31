'use client';

import { ShoppingCart, Check, Send, ArrowUpRight } from './icons';
import { useStore } from './StoreProvider';
import { WearBar } from './SkinCard';
import { rarityRgb } from '@/lib/skinMeta';
import { formatPrice } from '@/lib/products';

// Telegram kanaldagi bitta skin e'loni (rarity rangida neon, aniq float belgisi).
export default function TgSkinCard({ item: p, onOpen }) {
  const { t, add, items, setCartOpen } = useStore();
  const inCart = items.some((x) => x.id === p.id);
  const sold = p.status === 'sold';
  const rgb = rarityRgb(p.rarityColor || '#ffffff');
  const color = p.rarityColor || '#ffffff';

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_26px_var(--rglow)] ${sold ? 'opacity-70' : ''}`}
      style={{
        borderColor: `rgba(${rgb}, 0.32)`,
        background: 'linear-gradient(180deg, rgba(22,28,38,0.65) 0%, rgba(18,18,20,0.55) 100%)',
        boxShadow: `0 0 16px rgba(${rgb}, 0.16), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        '--rglow': `rgba(${rgb}, 0.38)`,
      }}
    >
      <span
        className="absolute inset-x-0 top-0 z-10 h-[2px]"
        style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        aria-hidden="true"
      />

      {/* rasm */}
      <button
        type="button"
        onClick={() => p.image && onOpen?.(p)}
        className="relative block w-full px-3 pb-1 pt-5 text-left"
        aria-label={p.name}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[45%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: color }}
        />
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/5 bg-black/40">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const el = e.currentTarget;
                if (p.fallbackImage && el.dataset.fb !== '1') {
                  el.dataset.fb = '1';
                  el.src = p.fallbackImage;
                  el.className = el.className.replace('object-cover', 'object-contain p-2');
                }
              }}
              draggable={false}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center px-4 text-center text-sm font-semibold text-white/60">{p.name}</div>
          )}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-black/55">
              <span className="-rotate-12 rounded-md border-2 border-rose-400/80 px-3 py-1 text-lg font-extrabold tracking-widest text-rose-300">
                {t('tg_sold')}
              </span>
            </span>
          )}
        </div>
      </button>

      {p.stattrak && (
        <span className="absolute left-4 top-6 z-20 rounded-md border border-line bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent backdrop-blur">
          StatTrak™
        </span>
      )}

      {/* tana */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div className="line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-tight">{p.name}</div>

        {p.quality && <WearBar wear={p.quality} minFloat={p.minFloat} maxFloat={p.maxFloat} value={p.float} />}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {p.float != null && (
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-white/80">Float {p.float}</span>
          )}
          {p.noBan && (
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">{t('tg_noban')}</span>
          )}
          {p.unban && (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">
              {t('tg_unban')}: {p.unban}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-bold leading-tight">
                {p.priceUzs != null ? formatPrice(p.priceUzs) : sold ? '—' : t('tg_price_ask')}
              </div>
              {p.priceUsdShown != null && !sold && (
                <div className="text-[11px] text-muted">{p.usdApprox ? '≈ ' : ''}${p.priceUsdShown}</div>
              )}
            </div>
            {!sold && p.priceUzs != null && (
              <button
                type="button"
                onClick={() =>
                  inCart
                    ? setCartOpen(true)
                    : add({
                        id: p.id,
                        kind: 'tgskin',
                        name: `${p.stattrak ? 'StatTrak™ ' : ''}${p.name}`,
                        price: p.priceUzs,
                        image: p.image,
                        wear: p.qualityName || p.quality,
                      })
                }
                aria-label={inCart ? t('tg_in_cart') : t('tg_add')}
                title={inCart ? t('tg_in_cart') : t('tg_add')}
                className={`grid h-11 w-11 flex-none place-items-center rounded-full border transition-all duration-300 hover:scale-110 ${
                  inCart
                    ? 'border-accent/60 bg-accent/15 text-accent shadow-[0_0_16px_rgba(255,255,255,0.35)]'
                    : 'border-accent bg-accent text-ink shadow-[0_0_18px_rgba(255,255,255,0.4)] hover:shadow-[0_0_26px_rgba(255,255,255,0.65)]'
                }`}
              >
                {inCart ? <Check className="h-5 w-5" strokeWidth={2.75} /> : <ShoppingCart className="h-5 w-5" strokeWidth={2.25} />}
              </button>
            )}
          </div>

          {sold ? (
            <div className="mt-3 w-full rounded-xl border border-line py-2.5 text-center text-sm font-semibold text-muted">
              {t('tg_sold')}
            </div>
          ) : (
            <div className="mt-3 flex items-stretch gap-2">
              <a
                href={p.buyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-accent/50 hover:bg-white/10 hover:text-accent"
              >
                <Send className="h-4 w-4" strokeWidth={2.25} />
                {t('tg_buy')}
              </a>
              <a
                href={p.link}
                target="_blank"
                rel="noreferrer"
                title={t('tg_view_post')}
                aria-label={t('tg_view_post')}
                className="grid w-11 flex-none place-items-center rounded-xl border border-white/10 text-muted transition hover:border-white/40 hover:text-white"
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
