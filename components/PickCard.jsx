'use client';

import Link from 'next/link';
import { useStore } from './StoreProvider';
import { ProductMedia } from './ProductCard';
import { Check, ArrowUpRight } from './icons';
import { weaponTypes } from '@/lib/products';
import { wearInfo, rarityInfo, unlockLabel } from '@/lib/skinMeta';

// Tanlanadigan skin kartasi (to'plam tuzish sahifasi): bosilsa tanlanadi / tanlov olinadi.
export default function PickCard({ product: p, selected, onToggle }) {
  const { lang } = useStore();
  const rarity = rarityInfo(p);
  const wearKey = wearInfo(p.wear)?.key || null;
  const lockText = p.availableAfter ? unlockLabel(p.availableAfter, lang) : null;
  const parts = String(p.name || '').split(' | ');
  const weapon = parts.length > 1 ? parts[0] : weaponTypes.find((w) => w.slug === p.weaponType)?.[lang] || '';
  const skinName = parts.length > 1 ? parts.slice(1).join(' | ') : p.name;
  const count = Number.isFinite(p.count) && p.count > 0 ? p.count : null;

  return (
    <div
      role="button"
      tabIndex={lockText ? -1 : 0}
      aria-pressed={selected}
      onClick={() => !lockText && onToggle(p)}
      onKeyDown={(e) => !lockText && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle(p))}
      className={`group relative flex select-none flex-col overflow-hidden rounded-xl border bg-panel p-2 text-left outline-none transition ${
        lockText ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${selected ? 'border-accent shadow-[0_0_0_1px_rgba(255,255,255,0.25)]' : 'border-line hover:border-white/30'}`}
    >
      <div className="flex items-center justify-between px-1 text-[10px]">
        <span className="font-semibold text-white/60">{wearKey || ''}</span>
        <span className="flex items-center gap-1.5">
          {p.stattrak && <span className="rounded bg-orange-500/15 px-1 py-px text-[9px] font-bold text-orange-400">ST</span>}
          {count && <span className="text-white/45">x{count}</span>}
        </span>
      </div>

      <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className="relative aspect-[4/3]" />

      <div className="px-1">
        <div className="truncate text-[10px] text-white/50">{weapon}</div>
        <div className="truncate text-[13px] font-semibold leading-tight">{skinName}</div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="whitespace-nowrap text-sm font-bold">
            {Number(p.price).toLocaleString('ru-RU')} <span className="text-[10px] font-normal text-white/50">so&apos;m</span>
          </span>
          <Link
            href={`/mahsulot/${p.id}`}
            onClick={(e) => e.stopPropagation()}
            aria-label="open"
            className="grid h-6 w-6 flex-none place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {lockText && <div className="mt-0.5 text-[10px] text-amber-300">{lockText}</div>}
      </div>

      {selected && (
        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-ink">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: rarity.color }} aria-hidden="true" />
    </div>
  );
}
