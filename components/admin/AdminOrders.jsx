'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@/lib/products';
import { Icon, Svg } from './ui';

const STATUS = {
  new: { label: 'Yangi', cls: 'border-line text-white/80' },
  paid: { label: "To'landi", cls: 'border-sky-500/40 text-sky-300 bg-sky-500/10' },
  fulfilling: { label: 'Yuborilmoqda', cls: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  sent: { label: 'Yuborildi', cls: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' },
  done: { label: 'Yakunlandi', cls: 'border-accent/50 text-accent bg-accent/10' },
  cancelled: { label: 'Bekor qilindi', cls: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
  refunded: { label: 'Qaytarildi', cls: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
};
const PAY_STATUS = {
  none: { label: "To'lovsiz", cls: 'text-muted' },
  pending: { label: 'Kutilmoqda', cls: 'text-amber-300' },
  paid: { label: "To'langan", cls: 'text-accent' },
  failed: { label: 'Bekor / xato', cls: 'text-rose-400' },
};
const FULFILL_STATUS = {
  none: { label: '—', cls: 'text-muted' },
  processing: { label: 'Jarayonda', cls: 'text-amber-300' },
  sent: { label: 'Trade yuborildi', cls: 'text-indigo-300' },
  done: { label: 'Yetkazildi', cls: 'text-accent' },
  error: { label: 'Xato', cls: 'text-rose-400' },
};
const FILTERS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'new', label: 'Yangi' },
  { key: 'paid', label: "To'langan" },
  { key: 'fulfilling', label: 'Yuborilmoqda' },
  { key: 'sent', label: 'Yuborildi' },
  { key: 'done', label: 'Yakunlangan' },
];
const NEXT = {
  new: ['paid', 'cancelled'],
  paid: ['fulfilling', 'sent', 'cancelled', 'refunded'],
  fulfilling: ['sent', 'cancelled', 'refunded'],
  sent: ['done', 'refunded'],
  done: [],
  cancelled: [],
  refunded: [],
};

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function Badge({ status }) {
  const s = STATUS[status] || STATUS.new;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function AdminOrders() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch(`/api/admin/orders?status=${filter}`, { cache: 'no-store' });
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setErr('Buyurtmalarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function patch(id, body) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Xato');
      setItems((prev) => prev.map((o) => (o.id === id ? d.order : o)));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function copy(text, tag) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(''), 1500);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
                filter === f.key ? 'border-white bg-white text-ink' : 'border-line text-white/75 hover:border-white/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-ghost px-3 py-1.5 text-xs">
          <Svg d={Icon.refresh} className="h-3.5 w-3.5" /> Yangilash
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <div className="hidden grid-cols-[110px_120px_1fr_130px_120px_36px] gap-3 border-b border-line bg-panel/60 px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted lg:grid">
          <span>Raqam</span>
          <span>Sana</span>
          <span>Mijoz</span>
          <span>Summa</span>
          <span>Holat</span>
          <span />
        </div>

        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-white/[0.03]" />
            ))}
          </div>
        ) : err ? (
          <div className="p-8 text-center text-sm text-rose-400">{err}</div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-3 p-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line text-muted">
              <Svg d={Icon.cart} className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted">Buyurtma yo&apos;q.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((o) => {
              const isOpen = openId === o.id;
              return (
                <div key={o.id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : o.id)}
                    className="grid w-full grid-cols-[1fr_36px] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02] lg:grid-cols-[110px_120px_1fr_130px_120px_36px]"
                  >
                    <span className="font-mono text-sm font-semibold tracking-wider">{o.ref}</span>
                    <span className="hidden text-xs text-muted lg:block">{fmtDate(o.createdAt)}</span>
                    <span className="hidden min-w-0 truncate text-sm lg:block">
                      {o.customer?.name} · <span className="text-muted">{o.customer?.phone}</span>
                    </span>
                    <span className="hidden text-sm font-semibold lg:block">{formatPrice(o.total || 0)}</span>
                    <span className="hidden lg:block"><Badge status={o.status} /></span>
                    <span className={`justify-self-end text-muted transition ${isOpen ? 'rotate-180' : ''}`}>
                      <Svg d={Icon.chevron} className="h-4 w-4" />
                    </span>

                    {/* mobil qator */}
                    <span className="col-span-2 -mt-1 flex flex-wrap items-center gap-2 text-xs text-muted lg:hidden">
                      <Badge status={o.status} />
                      {fmtDate(o.createdAt)} · {o.customer?.name} · <span className="font-semibold text-white/80">{formatPrice(o.total || 0)}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line bg-ink/40 p-4">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <div className="label mb-2">Mahsulotlar</div>
                          <ul className="space-y-1.5">
                            {o.items?.map((it, i) => (
                              <li key={i} className="flex justify-between gap-3 text-sm">
                                <span className="min-w-0 truncate">
                                  {it.kind === 'skin' && <span className="text-accent">◆ </span>}
                                  {it.name} × {it.qty}
                                </span>
                                <span className="flex-none text-muted">{formatPrice(it.price * it.qty)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-semibold">
                            <span>Jami</span>
                            <span>{formatPrice(o.total || 0)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="label mb-1">To&apos;lov</div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${(PAY_STATUS[o.payment?.status || 'none'] || PAY_STATUS.none).cls}`}>
                              {(PAY_STATUS[o.payment?.status || 'none'] || PAY_STATUS.none).label}
                            </span>
                            {o.payment?.provider && (
                              <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] uppercase text-muted">{o.payment.provider}</span>
                            )}
                          </div>
                          {o.payment?.providerTxnId && (
                            <div className="break-all text-[11px] text-muted">txn: {o.payment.providerTxnId}</div>
                          )}

                          <div className="label mb-1 mt-3">Mijoz</div>
                          <div>{o.customer?.name}</div>
                          <div className="text-muted">{o.customer?.phone}</div>
                          {o.customer?.tg && <div className="text-muted">{o.customer.tg}</div>}
                          {o.steam?.profileUrl && (
                            <a href={o.steam.profileUrl} target="_blank" rel="noreferrer" className="block truncate text-accent hover:underline">
                              🎮 {o.steam.name || 'Steam profil'}
                            </a>
                          )}
                          {o.tradeUrl && (
                            <button
                              onClick={() => copy(o.tradeUrl, o.id + 't')}
                              className="mt-1 flex w-full items-center gap-1.5 truncate rounded-lg border border-line bg-ink px-2.5 py-1.5 text-left text-xs text-white/80 hover:border-white/30"
                              title={o.tradeUrl}
                            >
                              <Svg d={Icon.copy} className="h-3.5 w-3.5 flex-none" />
                              {copied === o.id + 't' ? 'Nusxa olindi ✓' : o.tradeUrl}
                            </button>
                          )}
                          {o.note && <div className="text-muted">📝 {o.note}</div>}
                        </div>
                      </div>

                      {o.history?.length > 0 && (
                        <div className="mt-4">
                          <div className="label mb-1.5">Tarix</div>
                          <ul className="space-y-1 text-[11px] text-muted">
                            {o.history.map((h, i) => (
                              <li key={i}>
                                {fmtDate(h.at)} — {STATUS[h.status]?.label || h.status}
                                {h.note ? ` · ${h.note}` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {o.items?.some((it) => it.kind === 'skin') && (
                        <div className="mt-4 rounded-xl border border-line bg-ink/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="label">Avtomatik yetkazish</div>
                            <span className={`text-xs font-semibold ${(FULFILL_STATUS[o.fulfillment?.status || 'none'] || FULFILL_STATUS.none).cls}`}>
                              {(FULFILL_STATUS[o.fulfillment?.status || 'none'] || FULFILL_STATUS.none).label}
                              {o.fulfillment?.provider ? ` · ${o.fulfillment.provider}` : ''}
                            </span>
                          </div>
                          {o.fulfillment?.error && <p className="mt-1.5 text-xs text-rose-400">{o.fulfillment.error}</p>}
                          {o.fulfillment?.items?.length > 0 && (
                            <ul className="mt-2 space-y-1 text-[11px] text-muted">
                              {o.fulfillment.items.map((fi, i) => (
                                <li key={i} className="flex justify-between gap-2">
                                  <span className="min-w-0 truncate">{fi.marketHashName}</span>
                                  <span className={(FULFILL_STATUS[fi.state] || FULFILL_STATUS.none).cls}>
                                    {(FULFILL_STATUS[fi.state] || FULFILL_STATUS.none).label}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {o.status === 'paid' && (
                              <button disabled={busyId === o.id} onClick={() => patch(o.id, { action: 'fulfill' })}
                                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/85 hover:border-accent/50 disabled:opacity-50">
                                <Svg d={Icon.play} className="mr-1 inline h-3 w-3" /> Avtomatik yetkazish
                              </button>
                            )}
                            {['fulfilling', 'sent'].includes(o.status) && (
                              <button disabled={busyId === o.id} onClick={() => patch(o.id, { action: 'poll' })}
                                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/85 hover:border-white/40 disabled:opacity-50">
                                <Svg d={Icon.refresh} className="mr-1 inline h-3 w-3" /> Holatni tekshirish
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(NEXT[o.status] || []).map((next) => (
                          <button
                            key={next}
                            disabled={busyId === o.id}
                            onClick={() => patch(o.id, { status: next })}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                              next === 'cancelled' || next === 'refunded'
                                ? 'border border-rose-500/50 text-rose-300 hover:bg-rose-500/10'
                                : next === 'done'
                                  ? 'bg-accent text-ink hover:brightness-95'
                                  : 'border border-line text-white/85 hover:border-white/40'
                            }`}
                          >
                            → {STATUS[next]?.label || next}
                          </button>
                        ))}
                        {(NEXT[o.status] || []).length === 0 && (
                          <span className="text-xs text-muted">Yopilgan buyurtma</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
