'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { formatPrice } from '@/lib/products';

export default function PaymentReturnPage({ params }) {
  const { t } = useStore();
  const ref = params.ref;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const tries = useRef(0);

  useEffect(() => {
    let alive = true;
    let timer;

    // ?test=1 — test provayderi: to'lovni darhol tasdiqlaymiz
    const isTest =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === '1';

    async function tick() {
      try {
        if (isTest && tries.current === 0) {
          await fetch(`/api/pay/test/${ref}`, { method: 'POST' }).catch(() => {});
        }
        const r = await fetch(`/api/pay/status/${ref}`, { cache: 'no-store' });
        if (r.status === 404) {
          if (alive) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }
        const d = await r.json();
        if (!alive) return;
        setOrder(d.order);
        setLoading(false);

        tries.current += 1;
        // to'lov hali kutilayotgan bo'lsa — bir necha marta qayta so'raymiz
        if (d.order?.payment?.status === 'pending' && tries.current < 20) {
          timer = setTimeout(tick, 3000);
        }
      } catch {
        if (alive) setLoading(false);
      }
    }

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ref]);

  const paid = order?.payment?.status === 'paid';
  const failed = order?.payment?.status === 'failed';

  return (
    <section className="container-site flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="label">OXY / {t('checkout')}</span>

        {loading ? (
          <div className="mx-auto mt-6 h-24 w-full animate-pulse rounded-xl bg-white/5" />
        ) : notFound ? (
          <>
            <h1 className="mt-4 text-2xl font-bold">Buyurtma topilmadi</h1>
            <p className="mt-2 text-sm text-muted">Raqamni tekshiring: {ref}</p>
          </>
        ) : (
          <>
            <div
              className={`mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full text-2xl ${
                paid
                  ? 'bg-accent text-ink'
                  : failed
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-white/10 text-white'
              }`}
            >
              {paid ? '✓' : failed ? '✕' : '⏳'}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              {paid ? "To'lov qabul qilindi" : failed ? "To'lov amalga oshmadi" : "To'lov kutilmoqda"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {paid
                ? 'Buyurtmangiz ishlovga olindi. Tez orada skin yetkaziladi.'
                : failed
                  ? 'Qayta urinib ko\'ring yoki biz bilan bog\'laning.'
                  : 'To\'lov tasdiqlanishini kutmoqdamiz…'}
            </p>

            <div className="mt-5 rounded-xl border border-line bg-panel px-4 py-3 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Buyurtma</span>
                <span className="font-mono font-semibold tracking-wider">{order?.ref}</span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="text-muted">Summa</span>
                <span className="font-semibold">{formatPrice(order?.total || 0)}</span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="text-muted">Holat</span>
                <span>{order?.statusLabel}</span>
              </div>
            </div>

            <Link href="/" className="btn-primary mt-6 w-full">
              Bosh sahifa
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
