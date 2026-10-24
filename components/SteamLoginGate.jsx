'use client';

import { SteamIcon } from './icons';
import { useStore } from './StoreProvider';

// Skinlar ko'rsatiladigan har qanday sahifada Steam orqali kirilmagan
// bo'lsa shu bir xil ko'rinish chiqadi: orqa fonda xira (blur) skelet,
// markazda esa avtorizatsiya oynasi.
export default function SteamLoginGate({ title, subtitle, skeletonCount = 10 }) {
  const { t } = useStore();

  return (
    <section className="container-site relative py-10">
      <div aria-hidden="true" className="pointer-events-none select-none opacity-40 blur-sm">
        {title && (
          <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="h-10 w-10 flex-none rounded-full border border-line" />
          <div className="min-w-[180px] flex-1 rounded-full border border-line bg-panel py-2.5" />
          <div className="h-10 w-28 rounded-full border border-line bg-panel" />
          <div className="h-10 w-32 rounded-full border border-line bg-panel" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="card aspect-[3/4] bg-white/5" />
          ))}
        </div>
      </div>

      <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
        <div className="relative flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-3xl border border-accent/25 bg-panel/80 p-8 text-center shadow-[0_0_50px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
          />
          <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-accent/40 bg-ink text-accent shadow-[0_0_22px_rgba(255,255,255,0.25)]">
            <SteamIcon className="h-7 w-7" />
          </span>
          <h2 className="relative mt-1 text-xl font-semibold">{t('sell_login_title')}</h2>
          <p className="relative text-sm text-muted">{subtitle || t('sell_login_sub')}</p>
          <ul className="relative mt-2 w-full space-y-2 text-left text-xs text-white/75">
            {['gate_b1', 'gate_b2', 'gate_b3'].map((k) => (
              <li key={k} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full bg-accent/15 text-[10px] text-accent">✓</span>
                {t(k)}
              </li>
            ))}
          </ul>
          <a
            href="/api/auth/steam/login"
            className="btn-primary relative mt-4 inline-flex w-full items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,255,255,0.2)]"
          >
            <SteamIcon className="h-4 w-4" />
            {t('sell_login_cta')}
          </a>
        </div>
      </div>
    </section>
  );
}
