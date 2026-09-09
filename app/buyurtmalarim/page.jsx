'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import SteamLoginGate from '@/components/SteamLoginGate';
import { formatPrice } from '@/lib/products';

const STAGE_INDEX = { new: 0, pending: 0, paid: 1, fulfilling: 2, sent: 3, done: 4 };

function fmtDate(ms) {
  try {
    return new Date(ms).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const badgeCls = {
  none: 'border-line text-muted',
  new: 'border-white/20 text-white/80',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  paid: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  fulfilling: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  processing: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  sent: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  done: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  failed: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  cancelled: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  refunded: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

function Badge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        badgeCls[status] || badgeCls.none
      }`}
    >
      {label || status}
    </span>
  );
}

function Timeline({ order, t }) {
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';
  const hasSkin = (order.items || []).some((i) => i.kind === 'skin');
  const cur = STAGE_INDEX[order.status] ?? 0;

  const steps = [
    { key: 'created', label: t('myorders_step_created'), at: order.history?.[0]?.at || order.createdAt, i: 0 },
    { key: 'paid', label: t('myorders_step_paid'), at: histAt(order, 'paid'), i: 1 },
  ];
  if (hasSkin) {
    steps.push(
      { key: 'fulfilling', label: t('myorders_step_fulfilling'), at: histAt(order, 'fulfilling'), i: 2 },
      { key: 'sent', label: t('myorders_step_sent'), at: histAt(order, 'sent'), i: 3 }
    );
  }
  steps.push({ key: 'done', label: t('myorders_step_done'), at: histAt(order, 'done'), i: 4 });

  return (
    <ol className="mt-4 space-y-3">
      {steps.map((s) => {
        const reached = !cancelled && cur >= s.i;
        return (
          <li key={s.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border text-[11px] ${
                reached
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-line text-muted'
              }`}
            >
              {reached ? '✓' : ''}
            </span>
            <div className="min-w-0">
              <div className={`text-sm ${reached ? 'text-white/90' : 'text-muted'}`}>{s.label}</div>
              {reached && s.at && <div className="text-[11px] text-muted">{fmtDate(s.at)}</div>}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="flex items-center gap-3">
          <span className="grid h-5 w-5 flex-none place-items-center rounded-full border border-rose-500/40 bg-rose-500/15 text-[11px] text-rose-300">
            ✕
          </span>
          <div className="text-sm text-rose-300">{t('myorders_step_cancelled')}</div>
        </li>
      )}
    </ol>
  );
}

function histAt(order, status) {
  const h = (order.history || []).find((x) => x.status === status);
  return h?.at || null;
}

export default function BuyurtmalarimPage() {
  const { t, user, userLoading } = useStore();
  const [state, setState] = useState({ loading: true, error: '', orders: [] });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (userLoading || !user) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetch('/api/my/orders')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setState({ loading: false, error: t('myorders_error'), orders: [] });
        else setState({ loading: false, error: '', orders: d.orders || [] });
      })
      .catch(() => alive && setState({ loading: false, error: t('myorders_error'), orders: [] }));
    return () => {
      alive = false;
    };
  }, [user, userLoading, t]);

  if (!userLoading && !user) {
    return <SteamLoginGate title={t('myorders_title')} subtitle={t('myorders_login')} />;
  }

  const { loading, error, orders } = state;

  return (
    <section className="container-site py-10">
      <div className="mb-8">
        <span className="label">OXY</span>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('myorders_title')}</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">{t('myorders_subtitle')}</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-panel" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="card p-8 text-center text-sm text-rose-300">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">{t('myorders_empty')}</p>
          <Link href="/" className="btn-ghost mt-5 inline-flex">
            {t('myorders_to_catalog')}
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => {
            const isOpen = open === o.ref;
            return (
              <li key={o.ref} className="card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : o.ref)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold tracking-wider text-accent">
                        {o.ref}
                      </span>
                      <Badge status={o.status} label={o.statusLabel} />
                    </div>
                    <div className="mt-1 truncate text-xs text-muted">
                      {fmtDate(o.createdAt)} · {(o.items || []).map((i) => `${i.name}×${i.qty}`).join(', ')}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-sm font-semibold">{formatPrice(o.total)}</div>
                    <div className="text-[11px] text-muted">{isOpen ? '▲' : '▼'}</div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-line px-4 pb-4 pt-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                      <span className="text-muted">
                        {t('myorders_pay_status')}:{' '}
                        <Badge status={o.payment.status} label={o.payment.statusLabel} />
                        {o.payment.provider ? ` · ${o.payment.provider}` : ''}
                      </span>
                      <span className="text-muted">
                        {t('myorders_fulfill_status')}:{' '}
                        <Badge status={o.fulfillment.status} label={o.fulfillment.status} />
                      </span>
                    </div>

                    <ul className="mt-3 divide-y divide-line/60 rounded-lg border border-line/60">
                      {(o.items || []).map((i, idx) => (
                        <li key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="min-w-0 truncate pr-3">
                            {i.name} <span className="text-muted">× {i.qty}</span>
                          </span>
                          <span className="flex-none text-muted">{formatPrice(i.price * i.qty)}</span>
                        </li>
                      ))}
                    </ul>

                    <Timeline order={o} t={t} />

                    {o.status === 'pending' && (
                      <Link
                        href={`/tolov/${o.ref}`}
                        className="btn-primary mt-4 inline-flex text-sm"
                      >
                        {t('myorders_pay')}
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
