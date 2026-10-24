'use client';

import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';
import { formatPrice } from '@/lib/products';
import { site } from '@/lib/site';

const PRESETS = [50000, 100000, 250000, 500000, 1000000];
const METHOD_LABEL = { payme: 'Payme', click: 'Click', test: 'Test', demo: 'Demo' };

// Balansni to'ldirish: summa + usul (Payme / Click) tanlanadi, foydalanuvchi
// provayder sahifasiga o'tadi. To'lov tasdiqlangach balans AVTOMATIK tushadi
// (provayder callback'i -> lib/settle.js); admin tasdig'i kerak emas.
export default function TopUpModal({ open, onClose }) {
  const { t, refreshBalance } = useStore();
  const [amount, setAmount] = useState(100000);
  const [methods, setMethods] = useState(null); // null = yuklanmoqda, [] = ulanmagan
  const [method, setMethod] = useState('');
  const [min, setMin] = useState(10000);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    setMethods(null);
    let alive = true;
    fetch('/api/wallet', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list = Array.isArray(d.methods) ? d.methods : [];
        setMethods(list);
        setMethod((m) => (list.includes(m) ? m : list[0] || ''));
        if (Number.isFinite(d.minDeposit)) setMin(d.minDeposit);
      })
      .catch(() => alive && setMethods([]));
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < min) {
      setErr(`${t('topup_min')} ${formatPrice(min)}`);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value, provider: method }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || t('topup_error'));
      if (d.payUrl) {
        window.location.href = d.payUrl; // Payme / Click to'lov sahifasi
        return;
      }
      throw new Error(t('topup_error'));
    } catch (e2) {
      setErr(e2.message || t('topup_error'));
      refreshBalance();
    } finally {
      setSending(false);
    }
  }

  const unavailable = methods && methods.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-accent/25 bg-panel/90 p-6 shadow-[0_0_50px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <button aria-label="close" onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center text-muted hover:text-white">✕</button>

        {methods === null ? (
          <div className="relative space-y-3 py-2">
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/5" />
            <div className="h-24 animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : unavailable ? (
          <div className="relative text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line text-xl text-muted">⏳</div>
            <h2 className="mt-4 text-xl font-semibold">{t('topup_unavailable_title')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('topup_unavailable_text')}</p>
            <a href={site.telegram} className="btn-primary mt-5 w-full">{t('topup_contact')}</a>
          </div>
        ) : (
          <form onSubmit={submit} className="relative">
            <h2 className="text-xl font-semibold">{t('topup_title')}</h2>
            <p className="mt-1 text-sm text-muted">{t('topup_sub')}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                    Number(amount) === p
                      ? 'border-accent/60 bg-accent/15 text-accent shadow-[0_0_14px_rgba(255,255,255,0.25)]'
                      : 'border-line text-white/75 hover:border-white/40'
                  }`}
                >
                  {formatPrice(p)}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="label">{t('topup_amount')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={min}
                step="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 text-base font-semibold outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/25"
              />
              <span className="mt-1.5 block text-[11px] text-muted">{t('topup_min')} {formatPrice(min)}</span>
            </label>

            {methods.length > 1 && (
              <div className="mt-4">
                <span className="label">{t('topup_method')}</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {methods.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        method === m
                          ? 'border-accent/60 bg-accent/15 text-accent shadow-[0_0_14px_rgba(255,255,255,0.25)]'
                          : 'border-line text-white/80 hover:border-white/40'
                      }`}
                    >
                      {METHOD_LABEL[m] || m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === 'demo' && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
                DEMO rejim: balansga DEMO pul tushadi (haqiqiy emas). Undan to'langan buyurtmada skin yuborilmaydi.
              </p>
            )}

            {err && (
              <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{err}</p>
            )}

            <button type="submit" disabled={sending} className="btn-cta mt-5 disabled:opacity-50">
              {sending
                ? t('sending')
                : `${methods.length === 1 ? (METHOD_LABEL[method] || '') + ' · ' : ''}${t('topup_submit')} · ${formatPrice(Math.round(Number(amount)) || 0)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
