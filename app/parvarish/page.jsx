'use client';

import { useStore } from '@/components/StoreProvider';
import Reveal from '@/components/Reveal';

export default function CarePage() {
  const { t } = useStore();
  const steps = [t('care_1'), t('care_2'), t('care_3'), t('care_4')];

  return (
    <section className="container-site max-w-3xl py-16">
      <Reveal>
        <span className="label">OXY / care</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t('care_title')}</h1>
      </Reveal>

      <Reveal as="ol" stagger className="mt-10 space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="card flex gap-5 p-6">
            <span className="text-sm font-semibold text-accent">0{i + 1}</span>
            <p className="text-sm leading-relaxed text-white/80">{s}</p>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
