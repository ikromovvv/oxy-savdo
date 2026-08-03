'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from './StoreProvider';
import { formatPrice } from '@/lib/products';
import { site } from '@/lib/site';

export default function CartDrawer() {
  const { t, items, remove, setQty, total, cartOpen, setCartOpen, clear, user } = useStore();
  const [step, setStep] = useState('cart'); // cart | form | ok | err
  const [form, setForm] = useState({ name: '', phone: '', tg: '', note: '' });
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  // Steam bilan kirilgan bo'lsa, ism maydoni avtomatik to'ldiriladi (o'zgartirsa bo'ladi)
  useEffect(() => {
    if (user?.name && !form.name) setForm((f) => ({ ...f, name: user.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ochilganda sirg'alib chiqadi
  useLayoutEffect(() => {
    if (!cartOpen || !panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      gsap.from(panelRef.current, { xPercent: 100, duration: 0.5, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, [cartOpen]);

  // savat ochiq bo'lganda orqa fon scroll qilmasin
  useEffect(() => {
    const lenis = typeof window !== 'undefined' ? window.__lenis : null;
    if (cartOpen) lenis?.stop();
    else lenis?.start();
    return () => lenis?.start();
  }, [cartOpen]);

  if (!cartOpen) return null;

  const close = () => {
    setCartOpen(false);
    setTimeout(() => setStep(items.length ? 'cart' : 'cart'), 200);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items,
          total,
          steam: user ? { steamid: user.steamid, name: user.name, profileUrl: user.profileUrl } : null,
        }),
      });
      if (!res.ok) throw new Error('failed');
      clear();
      setStep('ok');
    } catch (err) {
      setStep('err');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div ref={overlayRef} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <aside ref={panelRef} className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-ink">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="text-sm font-semibold tracking-widest uppercase">{t('cart')}</span>
          <button onClick={close} className="text-muted hover:text-white">✕</button>
        </div>

        {step === 'ok' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <div className="text-2xl font-semibold">{t('ok_title')}</div>
            <p className="text-sm text-muted">{t('ok_text')}</p>
            <button onClick={close} className="btn-primary mt-4">OK</button>
          </div>
        )}

        {step === 'err' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm text-muted">{t('err_text')}</p>
            <a href={site.telegram} className="btn-primary">Telegram</a>
            <button onClick={() => setStep('cart')} className="text-xs text-muted underline">←</button>
          </div>
        )}

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">{t('cart_empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li key={it.id} className="card flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{it.name}</div>
                        <div className="text-xs text-muted">{formatPrice(it.price)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(it.id, it.qty - 1)} className="h-7 w-7 rounded-full border border-line">−</button>
                        <span className="w-6 text-center text-sm">{it.qty}</span>
                        <button onClick={() => setQty(it.id, it.qty + 1)} className="h-7 w-7 rounded-full border border-line">+</button>
                      </div>
                      <button onClick={() => remove(it.id)} className="text-muted hover:text-white">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="label">{t('total')}</span>
                <span className="text-lg font-semibold">{formatPrice(total)}</span>
              </div>
              <button
                disabled={!items.length}
                onClick={() => setStep('form')}
                className="btn-primary w-full disabled:opacity-40"
              >
                {t('checkout')}
              </button>
            </div>
          </>
        )}

        {step === 'form' && (
          <form onSubmit={submit} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
            {user && (
              <div className="mb-1 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                    {user.name?.[0]?.toUpperCase() || 'S'}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="text-[11px] text-muted">Steam</div>
                </div>
              </div>
            )}
            <Field label={t('name_label')} value={form.name} required
              onChange={(v) => setForm({ ...form, name: v })} />
            <Field label={t('phone_label')} value={form.phone} required type="tel"
              placeholder="+998 90 123 45 67" onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label={t('tg_label')} value={form.tg} placeholder="@username"
              onChange={(v) => setForm({ ...form, tg: v })} />
            <Field label={t('note_label')} value={form.note} textarea
              onChange={(v) => setForm({ ...form, note: v })} />

            <div className="mt-auto pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="label">{t('total')}</span>
                <span className="text-lg font-semibold">{formatPrice(total)}</span>
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-50">
                {sending ? t('sending') : t('submit')}
              </button>
              <button type="button" onClick={() => setStep('cart')} className="mt-3 w-full text-xs text-muted underline">
                ← {t('cart')}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder, textarea }) {
  const cls =
    'w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-white/40';
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea rows={3} className={`${cls} mt-2`} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} required={required} className={`${cls} mt-2`} value={value}
          placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
