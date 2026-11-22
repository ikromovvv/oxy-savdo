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

function Stat({ label, value, sub, accent, danger, wide }) {
  return (
    <div className={`card p-4 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
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

function Chart({ series, fmt = formatPrice, title = 'Tushum grafigi' }) {
  const [mode, setMode] = useState('day');
  const data = useMemo(() => bucket(series, mode), [series, mode]);
  const max = Math.max(1, ...data.map((d) => d.revenue));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="label">{title}</div>
        <div className="flex gap-1">
          {[
            ['day', 'Kunlik'],
            ['week', 'Haftalik'],
            ['month', 'Oylik'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
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
                  {fmt(d.revenue)} · {d.count} ta
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

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LIS_STATUS = {
  processing: ['Jarayonda', 'border-sky-400/40 text-sky-300'],
  wait_accept: ['Qabul kutilmoqda', 'border-sky-400/40 text-sky-300'],
  wait_unlock: ['Qulf kutilmoqda', 'border-amber-400/40 text-amber-300'],
  wait_withdraw: ['Qulf kutilmoqda', 'border-amber-400/40 text-amber-300'],
  return: ['Qaytarilgan', 'border-rose-400/40 text-rose-300'],
};

export default function AdminDashboard({ onGo, provider }) {
  const [site, setSite] = useState(null);
  const [lis, setLis] = useState(null);
  const [lisErr, setLisErr] = useState('');
  const [prodCount, setProdCount] = useState(null);
  const hasLis = provider === 'lis';

  useEffect(() => {
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => !d.error && setSite(d))
      .catch(() => {});

    Promise.all([
      fetch('/api/products?category=kovriklar').then((r) => r.json()),
      fetch('/api/products?category=aksessuar').then((r) => r.json()),
    ])
      .then(([a, b]) => setProdCount((a.items?.length || 0) + (b.items?.length || 0)))
      .catch(() => setProdCount(0));
  }, []);

  useEffect(() => {
    if (!hasLis) return;
    fetch('/api/admin/lis?section=stats', { cache: 'no-store' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (!ok || d.error ? setLisErr(d.error || 'xato') : d.configured === false ? setLisErr('LIS sozlanmagan') : setLis(d)))
      .catch(() => setLisErr('aloqa xatosi'));
  }, [hasLis]);

  const rev = site?.revenue || {};
  const siteSeries = site?.series || [];
  const siteHasRevenue = (rev.total || 0) > 0;

  return (
    <div>
      {hasLis && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">LIS-SKINS · haqiqiy ko&apos;rsatkichlar</h2>
            <button onClick={() => onGo?.('lis')} className="py-1 text-xs text-accent hover:underline">Batafsil →</button>
          </div>
          {lisErr && <div className="card mb-4 p-4 text-sm text-rose-400">LIS statistikasini yuklab bo&apos;lmadi: {lisErr}</div>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {!lis && !lisErr ? (
              Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />)
            ) : lis ? (
              <>
                <Stat label="LIS balansi" value={usd(lis.balance)} sub="Xarid uchun mavjud" accent wide />
                <Stat label="Bugun sarflandi" value={usd(lis.today.usd)} sub={`${lis.today.count} ta skin`} accent wide />
                <Stat label="Shu oy sarflandi" value={usd(lis.month.usd)} sub={`${lis.month.count} ta skin`} wide />
                <Stat label="Jami sotib olingan" value={usd(lis.accepted.usd)} sub={`${lis.accepted.count} ta qabul qilingan`} />
                <Stat label="Jarayonda" value={lis.inflight.count} sub={lis.inflight.count ? `${usd(lis.inflight.usd)} band` : 'yo\'q'} accent={lis.inflight.count > 0} />
                <Stat label="Qaytarilgan" value={lis.returned.count} sub={lis.returned.count ? `${usd(lis.returned.usd)} balansga qaytgan` : 'yo\'q'} danger={lis.returned.count > 0} />
                <Stat label="Muvaffaqiyat" value={lis.successRate != null ? `${lis.successRate}%` : '—'} sub="qabul / (qabul + qaytgan)" />
                <Stat label="Jami xarid" value={lis.total} sub="LIS tarixida" />
              </>
            ) : null}
          </div>

          {lis && (
            <div className="mt-4">
              <Chart series={lis.series} fmt={usd} title="Sarflangan summa (LIS, USD)" />
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">So&apos;nggi xaridlar</h2>
            <button onClick={() => onGo?.('lis')} className="py-2 text-xs text-accent hover:underline">Hammasi →</button>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line">
            {!lis ? (
              <div className="divide-y divide-line">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-white/[0.03]" />)}
              </div>
            ) : lis.recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted">Hali xarid yo&apos;q.</div>
            ) : (
              <div className="divide-y divide-line">
                {lis.recent.map((o) => {
                  const st = LIS_STATUS[o.status] || ['Qabul qilingan', 'border-emerald-400/40 text-emerald-300'];
                  return (
                    <button key={o.purchaseId + o.item} onClick={() => onGo?.('lis')} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{o.item}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${st[1]}`}>{st[0]}</span>
                          <span>#{o.purchaseId} · {fmtDate(o.createdAt)}</span>
                        </div>
                      </div>
                      <span className="flex-none whitespace-nowrap text-sm font-semibold">{usd(o.priceUsd)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Sayt savdosi (to&apos;langan buyurtmalar)</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!site ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />)
        ) : (
          <>
            <Stat label="Bugungi tushum" value={formatPrice(rev.today || 0)} accent wide />
            <Stat label="Oylik tushum" value={formatPrice(rev.month || 0)} wide />
            <Stat label="Umumiy tushum" value={formatPrice(rev.total || 0)} sub={`${rev.paidCount || 0} ta haqiqiy to'langan (demo/test hisobga olinmaydi)`} wide />
            <Stat label="Mahsulotlar" value={prodCount ?? '…'} sub="Kovrik + aksessuar" />
          </>
        )}
      </div>
      {site && siteHasRevenue && (
        <div className="mt-4">
          <Chart series={siteSeries} />
        </div>
      )}

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
        {(provider === 'cs2shop' || provider === 'lis') && (
          <button onClick={() => onGo?.(provider)} className="card card-hover flex items-center gap-3 p-4 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-line text-accent">
              <Svg d={Icon.wallet} className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">{provider === 'lis' ? 'LIS-SKINS' : 'cs2shop'}</div>
              <div className="text-xs text-muted">Balans, katalog, xaridlar</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
