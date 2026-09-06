'use client';

import { useStore } from './StoreProvider';
import Reveal from './Reveal';

// Hero ostidagi 4 ta afzallik kartasi (spec 6-bo'lim).
const ICONS = {
  bolt: (
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  shield: (
    <path
      d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Zm-1.2 12.5L8 12.7l1.4-1.4 1.4 1.4 3.8-3.8L16 10.3l-5.2 5.2Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  headset: (
    <path
      d="M4 13v-1a8 8 0 0 1 16 0v1m0 0v3a3 3 0 0 1-3 3h-2m5-6h-3v6h3M4 13h3v6H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  tag: (
    <path
      d="M20 11.5 12.5 4H4v8.5L11.5 20l8.5-8.5ZM7.5 9A1.5 1.5 0 1 1 9 7.5 1.5 1.5 0 0 1 7.5 9Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export default function FeatureCards() {
  const { t } = useStore();

  const items = [
    { icon: 'bolt', t: t('feat1_t'), d: t('feat1_d') },
    { icon: 'shield', t: t('feat2_t'), d: t('feat2_d') },
    { icon: 'headset', t: t('feat3_t'), d: t('feat3_d') },
    { icon: 'tag', t: t('feat4_t'), d: t('feat4_d') },
  ];

  return (
    <section className="container-site py-12">
      <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.t}
            className="card card-hover group flex items-center gap-4 p-4 sm:p-5"
          >
            <span className="relative grid h-11 w-11 flex-none place-items-center rounded-xl border border-line bg-ink">
              <span className="absolute inset-0 rounded-xl bg-accent/10 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
              <svg
                viewBox="0 0 24 24"
                className="relative h-5 w-5 fill-none stroke-accent stroke-[1.6]"
              >
                {ICONS[it.icon]}
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">{it.t}</div>
              <div className="mt-1 text-xs text-muted">{it.d}</div>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
