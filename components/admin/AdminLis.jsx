'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon, Svg, inputCls } from './ui';
import AdminLisCatalog from './AdminLisCatalog';

const usd = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const STATUS_STYLE = {
  processing: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  wait_accept: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  wait_unlock: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  wait_withdraw: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  return: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
};

function Chip({ status }) {
  const s = String(status || '').toLowerCase();
  const done = s && !STATUS_STYLE[s];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[s] || (done ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-line text-muted')}`}>
      {s || '—'}
    </span>
  );
}

function Stat({ label, value, sub, accent, danger }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${danger ? 'text-rose-400' : accent ? 'text-accent' : ''}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Row({ label, children, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="flex-none text-muted">{label}</span>
      <span className={`min-w-0 break-all text-right ${mono ? 'font-mono text-xs' : ''}`}>{children}</span>
    </div>
  );
}

const REASON = {
  trade_canceled: 'Offer rad etildi yoki bekor qilindi',
  trade_timeout: 'Offer vaqtida qabul qilinmadi (muddat tugadi)',
};

function PurchaseModal({ t, onClose }) {
  const s = String(t.status || '').toLowerCase();
  const refunded = s === 'return';
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label">Xarid #{t.purchaseId}</div>
            <h3 className="mt-1 text-xl font-semibold leading-snug tracking-tight">{t.item}</h3>
          </div>
          <button onClick={onClose} aria-label="Yopish" className="flex-none rounded-lg px-2 py-1 text-muted transition hover:bg-white/10 hover:text-white">✕</button>
        </div>

        {t.image && (
          <div className="mt-4 grid place-items-center rounded-xl bg-white/[0.04] p-4" style={t.rarityColor ? { boxShadow: `inset 0 -3px 0 ${t.rarityColor}` } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.image} alt={t.item} className="h-40 w-auto object-contain" />
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Chip status={t.status} />
          <span className="text-2xl font-bold">{usd(t.priceUsd)}</span>
          {t.rarity && <span className="text-xs text-muted">{t.rarity}</span>}
        </div>

        {refunded && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            {REASON[t.returnReason] || t.returnReason || 'Xarid qaytarildi'}. Pul ({usd(t.priceUsd)}) LIS balansiga qaytariladi.
          </div>
        )}
        {!refunded && s === 'wait_accept' && (
          <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-sm text-sky-200">
            Offer yuborilgan, qabul qiluvchi Steam&apos;da tasdiqlashi kutilmoqda. Qabul qilinmasa, muddati tugagach pul qaytadi.
          </div>
        )}
        {t.error && <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{t.error}</div>}

        <div className="mt-4">
          <Row label="Xarid ID" mono>{t.purchaseId}</Row>
          {t.customId && <Row label="Buyurtma (custom_id)" mono>{t.customId}</Row>}
          <Row label="Yaratilgan">{fmtDate(t.createdAt) || '—'}</Row>
          <Row label="Offer ID" mono>{t.offerId || '—'}</Row>
          {t.offerCreatedAt && <Row label="Offer yuborildi">{fmtDate(t.offerCreatedAt)}</Row>}
          {t.offerFinishedAt && <Row label="Offer yakunlandi">{fmtDate(t.offerFinishedAt)}</Row>}
          {t.steamId && <Row label="Qabul qiluvchi SteamID" mono>{t.steamId}</Row>}
          {t.returnReason && <Row label="Qaytish sababi" mono>{t.returnReason}</Row>}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {t.offerId && (
            <a href={`https://steamcommunity.com/tradeoffer/${t.offerId}/`} target="_blank" rel="noreferrer" className="btn-ghost">Steam&apos;da offer</a>
          )}
          <button onClick={onClose} className="btn-primary">Yopish</button>
        </div>
      </div>
    </div>
  );
}

function Overview({ data, loading, err, reload }) {
  const [open, setOpen] = useState(null);
  if (loading && !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />)}
      </div>
    );
  }
  if (data && data.configured === false) {
    return <div className="card p-5 text-sm text-rose-400">LIS-SKINS sozlanmagan (Vercel env: LIS_SKINS_API_KEY).</div>;
  }
  if (err || data?.error) {
    return (
      <div className="card p-5 text-sm">
        <span className="text-rose-400">Yuklab bo&apos;lmadi: {err || data.error}</span>
        <button onClick={reload} className="btn-ghost ml-3 inline-flex">Qayta urinish</button>
      </div>
    );
  }
  const by = data.byStatus || {};
  const inflight = (by.processing || 0) + (by.wait_accept || 0) + (by.wait_unlock || 0) + (by.wait_withdraw || 0);
  const returned = by.return || 0;
  const rows = data.purchases || [];

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      <div className="grid flex-none gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="LIS balansi" value={usd(data.balance)} sub="Xarid uchun mavjud" accent />
        <Stat label="Jami xaridlar" value={data.total ?? 0} sub="LIS tarixida" />
        <Stat label="Jarayonda" value={inflight} sub="processing / wait_accept" />
        <Stat label="Qaytarilgan" value={returned} sub="return (pul balansga qaytgan)" danger={returned > 0} />
      </div>

      <div className="card mt-4 flex min-h-0 flex-col overflow-hidden p-0 lg:min-h-[420px] lg:flex-1">
        <div className="flex flex-none items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="label">LIS-SKINS xaridlar</div>
            <div className="mt-1 text-lg font-semibold">So&apos;nggi faollik <span className="text-sm font-normal text-muted">· katalog: {data.skinsSource} · yetkazish: {data.fulfillProvider}</span></div>
          </div>
          <button onClick={reload} className="btn-ghost inline-flex items-center gap-2">
            <Svg d={Icon.refresh} className="h-4 w-4" />
            Yangilash
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">Hali xarid yo&apos;q.</div>
        ) : (
          <div className="admin-scroll min-h-0 flex-1 overflow-auto max-lg:max-h-[60vh]">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-panel text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Xarid</th>
                  <th className="px-4 py-3 font-semibold">Skin</th>
                  <th className="px-4 py-3 font-semibold">Holat</th>
                  <th className="px-4 py-3 font-semibold">Offer</th>
                  <th className="px-4 py-3 font-semibold">Sana</th>
                  <th className="px-4 py-3 font-semibold">Sabab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((t, i) => (
                  <tr key={`${t.purchaseId}-${i}`} onClick={() => setOpen(t)} className="cursor-pointer align-top transition hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px]">#{t.purchaseId}</div>
                      {t.customId && <div className="mt-0.5 break-all font-mono text-[10px] text-muted">{t.customId}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {t.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.image} alt="" loading="lazy" className="h-9 w-12 flex-none rounded-md bg-white/[0.05] object-contain" />
                        )}
                        <div className="min-w-0">
                          <div>{t.item}</div>
                          <div className="mt-0.5 text-muted">{usd(t.priceUsd)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Chip status={t.status} /></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">{t.offerId || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(t.createdAt)}</td>
                    <td className="max-w-[220px] px-4 py-3 text-muted">{t.returnReason || t.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <PurchaseModal t={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Tools({ onChanged }) {
  const [tradeUrl, setTradeUrl] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [test, setTest] = useState(null);
  async function testBuy() {
    if (!tradeUrl.trim()) return setTest({ error: 'Trade URL kiriting' });
    if (!window.confirm("LIS balansidan $2 gacha REAL pul yechiladi va eng arzon qulfsiz skin shu trade-linkka yuboriladi. Davom etamizmi?")) return;
    setTestBusy(true);
    setTest(null);
    try {
      const r = await fetch('/api/admin/lis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'test_buy', tradeUrl: tradeUrl.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      setTest(r.ok && d.ok ? d : { error: d.error || `HTTP ${r.status}` });
      if (r.ok && d.ok) onChanged?.();
    } catch {
      setTest({ error: 'aloqa xatosi' });
    } finally {
      setTestBusy(false);
    }
  }

  async function refreshTest() {
    if (!test?.ref) return;
    setTestBusy(true);
    try {
      const r = await fetch(`/api/admin/lis?ref=${encodeURIComponent(test.ref)}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      setTest((t) => ({ ...t, state: d.state || t.state, detail: d.detail || null, error: d.error || null }));
      onChanged?.();
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <div className="label">Test savdo</div>
        <p className="mt-2 text-sm text-muted">
          Eng arzon qulfsiz skin ($2 gacha) shu trade-linkka REAL sotib olinadi (LIS balansidan yechiladi).
        </p>
        <input
          value={tradeUrl}
          onChange={(e) => setTradeUrl(e.target.value)}
          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
          className={`${inputCls} mt-3`}
        />
        <button onClick={testBuy} disabled={testBusy} className="btn-primary mt-3 disabled:opacity-50">
          {testBusy ? '...' : 'Test savdo'}
        </button>
        {test && (
          <div className="mt-3 rounded-xl border border-line p-3 text-xs">
            {test.error && !test.ref ? (
              <span className="text-rose-400">Xato: {test.error}</span>
            ) : (
              <>
                <div className="font-mono text-white/90">{test.ref}</div>
                <div className="mt-1">{test.item} · {usd(test.priceUsd)}{test.float != null ? ` · float ${Number(test.float).toFixed(4)}` : ''}</div>
                <div className="mt-1">Holat: <b>{test.state || '—'}</b>{test.error && <span className="text-rose-400"> · {test.error}</span>}</div>
                {test.notified === false && <div className="mt-1 text-amber-300">Guruhga xabar ketmadi: {test.notifyError}</div>}
                <button onClick={refreshTest} disabled={testBusy} className="btn-ghost mt-2 disabled:opacity-50">Holatni yangilash</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLis() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    return fetch('/api/admin/lis', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr('aloqa xatosi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Katalog — to'liq ekran (admin menyusi/sarlavhasi yo'qoladi)
  if (tab === 'catalog') return <AdminLisCatalog onBack={() => setTab('overview')} />;

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      <div className="mb-5 flex-none">
        <h2 className="text-2xl font-bold tracking-tight">LIS-SKINS</h2>
        <p className="mt-1 text-sm text-muted">Yetkazib beruvchi: lis-skins.com. Balans, xaridlar va test savdo.</p>
      </div>
      <div className="no-scrollbar -mx-1 mb-5 flex flex-none gap-2 overflow-x-auto px-1">
        {[['overview', 'Umumiy'], ['catalog', 'Katalog'], ['tools', 'Test savdo']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-none whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === k ? 'border-white bg-white text-ink' : 'border-line text-white/75 hover:border-white/40 hover:text-white'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className={`min-h-0 flex-1 ${tab === 'overview' ? '' : 'admin-scroll lg:overflow-y-auto'}`}>
        {tab === 'overview' && <Overview data={data} loading={loading} err={err} reload={load} />}
        {tab === 'tools' && <Tools onChanged={load} />}
      </div>
    </div>
  );
}
