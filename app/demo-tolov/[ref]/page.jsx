'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/products';

// DEMO to'lov sahifasi — Payme/Click oynasi qanday ko'rinishini ko'rsatadi.
// Kiritilgan karta/kod HECH QAYERGA yuborilmaydi va saqlanmaydi. Production'da
// haqiqiy to'lov / balans o'zgarishi YO'Q; faqat lokal ishlab chiqishda to'lov
// simulyatsiya qilinadi (balans to'ldiriladi).
function fmtCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExp(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function DemoPaymentPage({ params }) {
  const ref = params.ref;
  const [order, setOrder] = useState(undefined); // undefined = yuklanmoqda, null = topilmadi
  const [step, setStep] = useState('card'); // card | sms | done
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [credited, setCredited] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/status/${ref}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { order: null }))
      .then((d) => setOrder(d.order || null))
      .catch(() => setOrder(null));
  }, [ref]);

  function toSms(e) {
    e.preventDefault();
    setErr('');
    if (card.replace(/\s/g, '').length !== 16) return setErr("Karta raqami 16 xonali bo'lishi kerak");
    const m = Number(exp.slice(0, 2));
    if (!/^\d{2}\/\d{2}$/.test(exp) || m < 1 || m > 12) return setErr("Amal qilish muddati MM/YY ko'rinishida");
    setStep('sms');
  }

  async function pay(e) {
    e.preventDefault();
    setErr('');
    if (code.length !== 6) return setErr('SMS kod 6 xonali');
    setBusy(true);
    // karta/kod yuborilmaydi — faqat lokal demo to'lovni simulyatsiya qilish so'rovi
    // (production'da server buni rad etadi: 403 -> faqat ko'rinish).
    try {
      const r = await fetch(`/api/pay/test/${ref}`, { method: 'POST' });
      setCredited(r.ok);
    } catch {
      setCredited(false);
    }
    setBusy(false);
    setStep('done');
  }

  const input =
    'w-full rounded-xl border border-line bg-ink px-4 py-3.5 text-base font-semibold tracking-wider outline-none placeholder:font-normal placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/25';

  return (
    <section className="container-site flex min-h-[80vh] items-center justify-center py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <div className="bg-amber-500/15 px-5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
          DEMO — haqiqiy to&apos;lov emas, haqiqiy karta kiritmang
        </div>

        {order === undefined ? (
          <div className="p-6">
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : order === null ? (
          <div className="p-8 text-center">
            <h1 className="text-xl font-bold">Buyurtma topilmadi</h1>
            <p className="mt-2 text-sm text-muted">{ref}</p>
            <Link href="/" className="btn-primary mt-5 w-full">Bosh sahifa</Link>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-muted">OXY SAVDO</span>
              <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] tracking-wider text-muted">{order.ref}</span>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{formatPrice(order.total)}</div>
            <div className="text-xs text-muted">{order.kind === 'deposit' ? "Balansni to'ldirish" : "Buyurtma uchun to'lov"}</div>

            {step === 'card' && (
              <form onSubmit={toSms} className="mt-6 space-y-3" autoComplete="off">
                <div>
                  <span className="label block">Karta raqami</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0000 0000 0000 0000"
                    value={card}
                    onChange={(e) => setCard(fmtCard(e.target.value))}
                    className={`${input} mt-2`}
                  />
                </div>
                <div>
                  <span className="label block">Amal qilish muddati</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="MM/YY"
                    value={exp}
                    onChange={(e) => setExp(fmtExp(e.target.value))}
                    className={`${input} mt-2 sm:w-40`}
                  />
                </div>
                {err && <p className="text-xs text-rose-400">{err}</p>}
                <button type="submit" className="btn-cta mt-2">Davom etish</button>
                <p className="pt-1 text-center text-[11px] leading-relaxed text-muted">
                  Haqiqiy Payme / Click sahifasida karta ma&apos;lumotini ular o&apos;zlari oladi, sayt uni ko&apos;rmaydi va saqlamaydi.
                </p>
              </form>
            )}

            {step === 'sms' && (
              <form onSubmit={pay} className="mt-6 space-y-3" autoComplete="off">
                <p className="text-sm text-muted">
                  Kartaga ulangan raqamga SMS-kod yuborildi: <span className="text-white/80">•••• {card.replace(/\s/g, '').slice(-4)}</span>
                </p>
                <div>
                  <span className="label block">SMS kod</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`${input} mt-2 text-center text-2xl tracking-[0.5em]`}
                  />
                  <span className="mt-1.5 block text-[11px] text-muted">Demo: istalgan 6 xonali kod.</span>
                </div>
                {err && <p className="text-xs text-rose-400">{err}</p>}
                <button type="submit" disabled={busy} className="btn-cta mt-2 disabled:opacity-50">
                  {busy ? 'Tekshirilmoqda…' : `To'lash · ${formatPrice(order.total)}`}
                </button>
                <button type="button" onClick={() => setStep('card')} className="w-full py-2 text-xs text-muted underline">
                  ← Kartani o&apos;zgartirish
                </button>
              </form>
            )}

            {step === 'done' && (
              <div className="mt-6 text-center">
                <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${credited ? 'bg-accent text-ink' : 'bg-amber-500/20 text-amber-300'}`}>
                  {credited ? '✓' : 'ℹ'}
                </div>
                <h2 className="mt-4 text-xl font-bold">{credited ? "To'lov o'tdi (demo)" : 'Demo yakunlandi'}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {credited
                    ? "Lokal demo: to'lov simulyatsiya qilindi va balans to'ldirildi."
                    : "Haqiqiy to'lov amalga oshmadi, balans o'zgarmadi. Payme/Click ulangach shu oqim haqiqiy bo'ladi."}
                </p>
                <Link href={credited ? `/tolov/${ref}` : '/'} className="btn-cta mt-5">
                  {credited ? 'Davom etish' : 'Bosh sahifa'}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
