'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '@/lib/products';
import { Icon, Svg } from './ui';

const STATUS_LABEL = {
  new: 'Yangi', pending: "To'lov kutilmoqda", paid: "To'landi", fulfilling: 'Yuborilmoqda',
  sent: 'Yuborildi', done: 'Yakunlandi', cancelled: 'Bekor', refunded: 'Qaytarildi',
};

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function Stat({ label, value, sub, accent, danger }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div
        className={`mt-1.5 text-2xl font-bold tracking-tight ${
          danger ? 'text-rose-400' : accent ? 'text-accent' : ''
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

// kunlik seriyani (30 kun) tanlangan oynaga guruhlaydi
function bucket(series, mode) {
  if (!series?.length) return [];
  if (mode === 'day') {
    return series.slice(-14).map((p) => ({
      key: p.d.slice(5),
      revenue: p.revenue,
      count: p.count,
    }));
  }
  if (mode === 'week') {
    const out = [];
    for (let i = 0; i < series.length; i += 7) {
      const chunk = series.slice(i, i + 7);
      out.push({
        key: chunk[0].d.slice(5),
        revenue: chunk.reduce((s, x) => s + x.revenue, 0),
        count: chunk.reduce((s, x) => s + x.count, 0),
      });
    }
    return out;
  }
  // month — 30 kunlik oynada odatda 1-2 oy; oy bo'yicha yig'amiz
  const map = new Map();
  for (const p of series) {
    const m = p.d.slice(0, 7);
    const cur = map.get(m) || { key: m, revenue: 0, count: 0 };
    cur.revenue += p.revenue;
    cur.count += p.count;
    map.set(m, cur);
  }
  return [...map.values()];
}

function Chart({ series }) {
  const [mode, setMode] = useState('day');
  const data = useMemo(() => bucket(series, mode), [series, mode]);
  const max = Math.max(1, ...data.map((d) => d.revenue));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="label">Tushum grafigi</div>
        <div className="flex gap-1">
          {[
            ['day', 'Kunlik'],
            ['week', 'Haftalik'],
            ['month', 'Oylik'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                mode === k ? 'border-white bg-white text-ink' : 'border-line text-muted hover:border-white/40'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted">Ma&apos;lumot yo&apos;q</div>
      ) : (
        <div className="mt-4 flex h-40 items-stretch gap-1.5">
          {data.map((d, i) => (
            <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="relative w-full flex-1">
                <div
                  className="absolute bottom-0 w-full rounded-t bg-accent/70 transition group-hover:bg-accent"
                  style={{ height: `${Math.round((d.revenue / max) * 100)}%` }}
                />
                <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-ink px-2 py-1 text-[10px] text-white/90 group-hover:block">
                  {formatPrice(d.revenue)} · {d.count} ta
                </div>
              </div>
              <span className="w-full truncate text-center text-[9px] text-muted">{d.key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ onGo }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [prodCount, setProdCount] = useState(null);

  useEffect(() => {
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(true) : setData(d)))
      .catch(() => setErr(true));

    Promise.all([
      fetch('/api/products?category=kovriklar').then((r) => r.json()),
      fetch('/api/products?category=aksessuar').then((r) => r.json()),
    ])
      .then(([a, b]) => setProdCount((a.items?.length || 0) + (b.items?.length || 0)))
      .catch(() => setProdCount(0));
  }, []);

  const loading = !data && !err;
  const c = data?.counts || {};
  const rev = data?.revenue || {};
  const recent = data?.recent || [];

  return (
    <div>
      {err && (
        <div className="card mb-4 p-4 text-sm text-rose-400">Ko&apos;rsatkichlarni yuklab bo&apos;lmadi.</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />)
        ) : (
          <>
            <Stat label="Bugungi tushum" value={formatPrice(rev.today || 0)} sub={`Buyurtma: ${c.today || 0}`} accent />
            <Stat label="Oylik tushum" value={formatPrice(rev.month || 0)} sub="Joriy oy" accent />
            <Stat label="Umumiy tushum" value={formatPrice(rev.total || 0)} sub="Barcha to'langan" />
            <Stat label="Mahsulotlar" value={prodCount ?? '…'} sub="Kovrik + aksessuar" />
            <Stat label="Jami buyurtma" value={c.total || 0} />
            <Stat label="Yakunlangan" value={c.completed || 0} sub="done" />
            <Stat label="To'lov kutilmoqda" value={c.pendingPayments || 0} accent={(c.pendingPayments || 0) > 0} />
            <Stat
              label="Yetkazish xatosi"
              value={c.failed || 0}
              sub={c.fulfilling ? `Jarayonda: ${c.fulfilling}` : undefined}
              danger={(c.failed || 0) > 0}
            />
          </>
        )}
      </div>

      {!loading && !err && (
        <div className="mt-4">
          <Chart series={data.series} />
        </div>
      )}

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
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="whitespace-nowrap font-mono text-sm font-semibold tracking-wider">{o.ref}</span>
                    <span className="whitespace-nowrap rounded-full border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted">
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {o.customerName} · {o.nItems} ta · {fmtDate(o.createdAt)}
                  </div>
                </div>
                <span className="flex-none whitespace-nowrap text-sm font-semibold">{formatPrice(o.total || 0)}</span>
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
