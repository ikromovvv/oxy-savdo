'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/products';
import { Icon, Svg } from './ui';

const STATUS_LABEL = {
  new: 'Yangi', paid: "To'landi", fulfilling: 'Yuborilmoqda', sent: 'Yuborildi',
  done: 'Yakunlandi', cancelled: 'Bekor', refunded: 'Qaytarildi',
};

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold tracking-tight ${accent ? 'text-accent' : ''}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard({ onGo }) {
  const [orders, setOrders] = useState(null);
  const [prodCount, setProdCount] = useState(null);

  useEffect(() => {
    fetch('/api/admin/orders', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d.items) ? d.items : []))
      .catch(() => setOrders([]));

    Promise.all([
      fetch('/api/products?category=kovriklar').then((r) => r.json()),
      fetch('/api/products?category=aksessuar').then((r) => r.json()),
    ])
      .then(([a, b]) => setProdCount((a.items?.length || 0) + (b.items?.length || 0)))
      .catch(() => setProdCount(0));
  }, []);

  const loading = orders === null;
  const list = orders || [];
  const startOfDay = new Date().setHours(0, 0, 0, 0);

  const total = list.length;
  const today = list.filter((o) => o.createdAt >= startOfDay).length;
  const pending = list.filter((o) => ['new', 'paid', 'fulfilling', 'sent'].includes(o.status)).length;
  const revenue = list
    .filter((o) => o.payment?.status === 'paid' || ['done', 'sent', 'fulfilling'].includes(o.status))
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
  const recent = [...list].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />)
        ) : (
          <>
            <Stat label="Buyurtmalar" value={total} sub={`Bugun: ${today}`} />
            <Stat label="Kutilmoqda" value={pending} sub="Yangi + jarayonda" accent={pending > 0} />
            <Stat label="Tushum" value={formatPrice(revenue)} sub="To'langan / yuborilgan" accent />
            <Stat label="Mahsulotlar" value={prodCount ?? '…'} sub="Kovrik + aksessuar" />
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">So&apos;nggi buyurtmalar</h2>
        <button onClick={() => onGo?.('orders')} className="text-xs text-accent hover:underline">
          Hammasi →
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-white/[0.03]" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">Hali buyurtma yo&apos;q.</div>
        ) : (
          <div className="divide-y divide-line">
            {recent.map((o) => (
              <button
                key={o.id}
                onClick={() => onGo?.('orders')}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
              >
                <span className="font-mono text-sm font-semibold tracking-wider">{o.ref}</span>
                <span className="hidden text-xs text-muted sm:block">{fmtDate(o.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {o.customer?.name} · {o.items?.length} ta
                </span>
                <span className="text-sm font-semibold">{formatPrice(o.total || 0)}</span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {STATUS_LABEL[o.status] || o.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button onClick={() => onGo?.('products')} className="card card-hover flex items-center gap-3 p-4 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-line text-accent">
            <Svg d={Icon.box} className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold">Mahsulotlar</div>
            <div className="text-xs text-muted">Kovrik / aksessuar qo&apos;shish, tahrirlash</div>
          </div>
        </button>
        <button onClick={() => onGo?.('orders')} className="card card-hover flex items-center gap-3 p-4 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-line text-accent">
            <Svg d={Icon.cart} className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold">Buyurtmalar</div>
            <div className="text-xs text-muted">Holat, to&apos;lov, yetkazish</div>
          </div>
        </button>
      </div>
    </div>
  );
}
