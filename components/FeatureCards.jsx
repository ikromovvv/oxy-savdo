'use client';

import { useStore } from './StoreProvider';
import Reveal from './Reveal';
import { Zap, ShieldCheck, Headset, Tag } from './icons';

// Hero ostidagi 4 ta afzallik kartasi (spec 6-bo'lim).
const ICONS = { bolt: Zap, shield: ShieldCheck, headset: Headset, tag: Tag };

function FeatureIcon({ name }) {
  const Icon = ICONS[name];
  return Icon ? <Icon className="relative h-5 w-5 text-accent" strokeWidth={1.6} /> : null;
}

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
              <FeatureIcon name={it.icon} />
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
