'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@/lib/products';
import { Icon, Svg } from './ui';

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function rel(ts) {
  if (!ts) return '';
  const diff = ts - Date.now();
  const min = Math.round(diff / 60000);
  if (min <= 0) return 'hozir';
  if (min < 60) return `${min} daq`;
  return `${Math.round(min / 60)} soat`;
}

export default function AdminFailed({ onOpenOrders }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/orders?status=all&fulfillment=error', { cache: 'no-store' });
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setErr('Yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function retry(id) {
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill', force: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Xato');
      // muvaffaqiyatli bo'lsa ro'yxatdan chiqadi, aks holda yangilanadi
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Avtomatik yetkazishda xato bergan buyurtmalar. Cron backoff bilan o&apos;zi qayta
          urinadi; bu yerdan qo&apos;lda ham majburlash mumkin.
        </p>
        <button onClick={load} className="btn-ghost flex-none px-3 py-1.5 text-xs">
          <Svg d={Icon.refresh} className="h-3.5 w-3.5" /> Yangilash
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-white/[0.03]" />
          ))
        ) : err ? (
          <div className="card p-8 text-center text-sm text-rose-400">{err}</div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-line p-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-500/40 text-emerald-400">
              <Svg d={Icon.check} className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted">Yetkazish xatosi yo&apos;q.</p>
          </div>
        ) : (
          items.map((o) => {
            const f = o.fulfillment || {};
            return (
              <div key={o.id} className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold tracking-wider">{o.ref}</span>
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                    {f.exhausted ? 'Limit tugadi' : 'Xato'}
                  </span>
                  <span className="text-xs text-muted">
                    Urinish: {f.attempts || 0}
                    {!f.exhausted && f.nextRetryAt ? ` · keyingi ~${rel(f.nextRetryAt)}` : ''}
                  </span>
                  <span className="ml-auto text-sm font-semibold">{formatPrice(o.total || 0)}</span>
                </div>

                <p className="mt-2 rounded-lg border border-rose-500/20 bg-ink/40 px-3 py-2 text-xs text-rose-300">
                  {f.lastError || f.error || 'Noma\'lum xato'}
                </p>

                <div className="mt-2 text-[11px] text-muted">
                  {o.customer?.name} · {o.customer?.phone} · oxirgi urinish {fmtDate(f.lastAttemptAt)}
                </div>

                {f.items?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px] text-muted">
                    {f.items.map((fi, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate">{fi.marketHashName}</span>
                        <span className={fi.state === 'error' ? 'text-rose-400' : ''}>{fi.state}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy === o.id}
                    onClick={() => retry(o.id)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/85 hover:border-accent/50 disabled:opacity-50"
                  >
                    <Svg d={Icon.play} className="mr-1 inline h-3 w-3" />
                    {busy === o.id ? 'Urinilmoqda…' : 'Majburan qayta urinish'}
                  </button>
                  <button
                    onClick={() => onOpenOrders?.()}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/85 hover:border-white/40"
                  >
                    Buyurtmalarda ochish
                  </button>
                  {o.steam?.profileUrl && (
                    <a
                      href={o.steam.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-accent hover:border-accent/50"
                    >
                      Steam profil
                    </a>
                  )}
                  {o.tradeUrl && (
                    <a
                      href={o.tradeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-white/40"
                    >
                      Trade URL
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
