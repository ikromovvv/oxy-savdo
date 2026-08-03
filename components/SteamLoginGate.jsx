'use client';

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
        <div className="card flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg font-bold text-ink">
            O
          </span>
          <h2 className="mt-1 text-xl font-semibold">{t('sell_login_title')}</h2>
          <p className="text-sm text-muted">{subtitle || t('sell_login_sub')}</p>
          <a
            href="/api/auth/steam/login"
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 2C6.95 2 2.8 5.8 2.14 10.7l4.5 1.86a2.7 2.7 0 0 1 1.53-.47c.06 0 .12 0 .18.01l2-2.9v-.04a3.6 3.6 0 0 1 3.6-3.6 3.6 3.6 0 0 1 0 7.2h-.08l-2.86 2.04c0 .06.01.11.01.17a2.72 2.72 0 0 1-5.4.5L2 15.06C2.9 19.14 6.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm-2.02 15.34-1.03-.43a2.06 2.06 0 0 0 1.9 1.27 2.07 2.07 0 0 0 2.07-2.07 2.06 2.06 0 0 0-.86-1.68l1.06.44a1.52 1.52 0 1 1-1.17 2.8l-1.97-.33Zm7.65-8.32a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Zm-2.4 1.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />
            </svg>
            {t('sell_login_cta')}
          </a>
        </div>
      </div>
    </section>
  );
}
