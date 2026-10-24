'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from './StoreProvider';
import { playSfx } from '@/lib/sfx';
import { ProductMedia } from './ProductCard';
import { formatPrice } from '@/lib/products';
import { isValidTradeUrl, parseTradeUrl } from '@/lib/steamTrade';
import { site } from '@/lib/site';

const TRASH = 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7';

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`} aria-hidden="true">
      <path d={TRASH} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Savat qatoridagi kichik rasm (rasm bo'lmasa — bosh harfli gradient)
function Thumb({ it }) {
  return it.image ? (
    <ProductMedia
      product={it}
      className="h-16 w-16 flex-none rounded-xl border border-white/5 bg-black/30 sm:h-[72px] sm:w-[72px]"
    />
  ) : (
    <div className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-gradient-to-br from-white/10 to-black text-lg font-bold text-white/70 sm:h-[72px] sm:w-[72px]">
      {String(it.name || '?').replace(/^[^A-Za-z0-9А-Яа-я]+/, '').charAt(0).toUpperCase()}
    </div>
  );
}

export default function CartDrawer() {
  const { t, items, remove, setQty, total, count, cartOpen, setCartOpen, clear, user, balance, wallet, refreshBalance } = useStore();
  const [step, setStep] = useState('cart'); // cart | form | ok | err
  const [form, setForm] = useState({ name: '', phone: '', tg: '', note: '', tradeUrl: '' });
  const [sending, setSending] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [okRef, setOkRef] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const isSkinKind = (it) => it.kind === 'skin' || it.kind === 'tgskin';
  const hasSkins = items.some(isSkinKind);
  // LIS-SKINS uslubi: Steam bilan kirgan + savatda faqat skin -> forma yo'q,
  // faqat (saqlangan) Trade URL va bitta "Sotib olish" tugmasi.
  const express = Boolean(user) && items.length > 0 && items.every(isSkinKind);
  const [editTrade, setEditTrade] = useState(false);
  const tradeKey = user?.steamid ? `oxy:trade:${user.steamid}` : null;
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  // Steam bilan kirilgan bo'lsa, ism maydoni avtomatik to'ldiriladi (o'zgartirsa bo'ladi)
  useEffect(() => {
    if (user?.name && !form.name) setForm((f) => ({ ...f, name: user.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // saqlangan Trade URL'ni yuklaymiz (har safar qayta kiritmaslik uchun)
  useEffect(() => {
    if (!tradeKey) return;
    try {
      const v = localStorage.getItem(tradeKey);
      if (v && isValidTradeUrl(v)) setForm((f) => (f.tradeUrl ? f : { ...f, tradeUrl: v }));
    } catch {}
  }, [tradeKey]);

  // ochilganda sirg'alib chiqadi
  useLayoutEffect(() => {
    if (!cartOpen || !panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      gsap.from(panelRef.current, { y: 28, scale: 0.96, opacity: 0, duration: 0.38, ease: 'power3.out' });
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

  // payWith === 'balance' -> hamyondan (narx va balans serverda tekshiriladi)
  const submit = async (e, payWith) => {
    e?.preventDefault?.();
    setFormErr('');

    if (hasSkins && !isValidTradeUrl(form.tradeUrl)) {
      setFormErr(t('trade_url_invalid'));
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(express ? { name: user.name, phone: '', tg: '', note: '', tradeUrl: form.tradeUrl } : form),
          items,
          total,
          ...(payWith === 'balance' ? { payWith: 'balance' } : {}),
          steam: user ? { steamid: user.steamid, name: user.name, profileUrl: user.profileUrl } : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'failed');
      if (tradeKey && isValidTradeUrl(form.tradeUrl)) {
        try { localStorage.setItem(tradeKey, form.tradeUrl); } catch {}
      }
      clear();

      // to'lov linki bo'lsa — to'lovga yo'naltiramiz
      if (data.payUrl) {
        window.location.href = data.payUrl;
        return;
      }
      if (data.paid) refreshBalance();
      setOkRef(data.order?.ref || '');
      setStep('ok');
      playSfx('success');
    } catch (err) {
      // server rad etgan aniq sabab (narx yangilandi, noto'g'ri trade URL ...) ko'rsatiladi
      setErrMsg(err?.message && err.message !== 'failed' ? err.message : '');
      setStep('err');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div ref={overlayRef} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <aside ref={panelRef} className="relative flex max-h-[92vh] min-h-[320px] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-ink shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_40px_rgba(255,255,255,0.06)]">
        <div className="flex flex-none items-center justify-between px-6 pb-3 pt-5">
          <span className="text-2xl font-bold tracking-tight">{t('cart')}</span>
          <button aria-label="close" onClick={close} className="grid h-10 w-10 place-items-center rounded-full text-2xl text-muted transition hover:bg-white/5 hover:text-white">✕</button>
        </div>

        {step === 'ok' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <div className="text-2xl font-semibold">{t('ok_title')}</div>
            <p className="text-sm text-muted">{t('ok_text')}</p>
            {okRef && (
              <div className="mt-3 rounded-xl border border-line bg-panel px-4 py-2.5">
                <div className="label">{t('order_ref_label')}</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tracking-wider text-accent">
                  {okRef}
                </div>
              </div>
            )}
            <button onClick={close} className="btn-primary mt-4">OK</button>
          </div>
        )}

        {step === 'err' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            {errMsg && <p className="text-sm text-white/85">{errMsg}</p>}
            <p className="text-sm text-muted">{t('err_text')}</p>
            <a href={site.telegram} className="btn-primary">Telegram</a>
            <button onClick={() => setStep('cart')} className="text-xs text-muted underline">←</button>
          </div>
        )}

        {step === 'cart' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
              {items.length === 0 ? (
                <div className="grid place-items-center gap-3 py-14 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-muted">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2" aria-hidden="true">
                      <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 6H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-sm text-muted">{t('cart_empty')}</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.04] px-4 py-3">
                    <span className="whitespace-nowrap text-base font-semibold">
                      {count} {t('cart_items')}
                    </span>
                    <button
                      onClick={clear}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40 hover:text-white"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      {t('cart_clear')}
                    </button>
                  </div>

                  <ul className="space-y-2.5">
                    {items.map((it) => (
                      <li key={it.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl bg-white/[0.04] p-3 sm:grid-cols-[72px_minmax(0,1fr)_auto_auto]">
                        <div className="row-span-2 sm:row-span-1"><Thumb it={it} /></div>
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-medium leading-snug">{it.name}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {it.wear && (
                              <span className="rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">{it.wear}</span>
                            )}
                            {it.kind !== 'tgskin' && <div className="flex items-center gap-0.5">
                              <button aria-label="−" onClick={() => setQty(it.id, it.qty - 1)} className="h-8 w-8 rounded-full border border-line text-sm">−</button>
                              <span className="w-6 text-center text-sm">{it.qty}</span>
                              <button aria-label="+" onClick={() => setQty(it.id, it.qty + 1)} className="h-8 w-8 rounded-full border border-line text-sm">+</button>
                            </div>}
                          </div>
                        </div>
                        <div className="col-start-2 row-start-2 whitespace-nowrap text-left text-sm font-bold sm:col-start-3 sm:row-start-1 sm:text-right sm:text-base">{formatPrice(it.price * it.qty)}</div>
                        <button
                          aria-label="remove"
                          onClick={() => remove(it.id)}
                          className="col-start-3 row-span-2 row-start-1 grid h-11 w-11 place-items-center rounded-xl bg-white/[0.07] text-white/80 transition hover:bg-rose-500/20 hover:text-rose-300 sm:col-start-4 sm:row-span-1"
                        >
                          <TrashIcon className="h-[18px] w-[18px]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex-none px-6 pb-3 pt-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xl font-bold">{t('total')}</span>
                  <span className="hidden text-sm text-muted sm:inline">{count} {t('cart_items')}</span>
                </div>
                <span className="whitespace-nowrap text-lg font-bold sm:text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="flex-none px-5 pb-5">
              {express ? (
                <>
                  {isValidTradeUrl(form.tradeUrl) && !editTrade ? (
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-xs">
                      <span className="min-w-0 truncate text-muted">
                        Trade URL: <span className="text-white/80">…{parseTradeUrl(form.tradeUrl)?.token}</span>
                      </span>
                      <button onClick={() => setEditTrade(true)} className="flex-none py-1.5 pl-3 text-accent">
                        {t('trade_url_change')}
                      </button>
                    </div>
                  ) : (
                    <label className="mb-3 block">
                      <span className="label">{t('trade_url_label')} *</span>
                      <input
                        type="url"
                        value={form.tradeUrl}
                        placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
                        onChange={(e) => setForm({ ...form, tradeUrl: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-accent/60 focus:ring-1 focus:ring-accent/25"
                      />
                      <span className="mt-1.5 block text-[11px] leading-snug text-muted">{t('trade_url_help')}</span>
                      <a
                        href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                      >
                        {t('trade_url_get')} ↗
                      </a>
                    </label>
                  )}
                  {formErr && (
                    <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                      {formErr}
                    </p>
                  )}
                  {balance != null && wallet.payable >= total ? (
                    <>
                      {wallet.real < total && (
                        <p className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
                          DEMO balansdan to'lanadi: haqiqiy pul emas, skin yuborilmaydi.
                        </p>
                      )}
                      <button
                        disabled={!items.length || sending}
                        onClick={() => { setEditTrade(false); submit(null, 'balance'); }}
                        className="btn-cta disabled:opacity-50"
                      >
                        {sending ? t('sending') : `${t('pay_balance')} · ${formatPrice(total)}`}
                      </button>
                      <button
                        disabled={!items.length || sending}
                        onClick={() => { setEditTrade(false); submit(); }}
                        className="btn-ghost mt-2 w-full disabled:opacity-50"
                      >
                        {t('pay_card')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={!items.length || sending}
                        onClick={() => { setEditTrade(false); submit(); }}
                        className="btn-cta disabled:opacity-50"
                      >
                        {sending ? t('sending') : t('buy_now')}
                      </button>
                      {balance != null && (
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('oxy:topup'))}
                          className="mt-2 w-full py-2 text-center text-xs text-accent hover:underline"
                        >
                          {t('balance_low')} ({formatPrice(balance)}) · {t('balance_topup')}
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <button
                  disabled={!items.length}
                  onClick={() => setStep('form')}
                  className="btn-cta disabled:opacity-40"
                >
                  {t('checkout')}
                </button>
              )}
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

            {hasSkins && (
              <label className="block">
                <span className="label">{t('trade_url_label')} *</span>
                <input
                  type="url"
                  required
                  value={form.tradeUrl}
                  placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
                  onChange={(e) => setForm({ ...form, tradeUrl: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-accent/60 focus:ring-1 focus:ring-accent/25"
                />
                <span className="mt-1.5 block text-[11px] leading-snug text-muted">
                  {t('trade_url_help')}
                </span>
                <a
                  href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                >
                  {t('trade_url_get')} ↗
                </a>
              </label>
            )}

            <Field label={t('note_label')} value={form.note} textarea
              onChange={(v) => setForm({ ...form, note: v })} />

            {formErr && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                {formErr}
              </p>
            )}

            <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-auto border-t border-line bg-ink px-5 pb-5 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="label">{t('total')}</span>
                <span className="text-lg font-semibold">{formatPrice(total)}</span>
              </div>
              <button type="submit" disabled={sending} className="btn-cta disabled:opacity-50">
                {sending ? t('sending') : t('submit')}
              </button>
              <button type="button" onClick={() => setStep('cart')} className="mt-1 w-full py-3 text-xs text-muted underline">
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
