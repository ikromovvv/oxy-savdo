'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon, Svg, inputCls } from './ui';

const usd = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

const STATUS_STYLE = {
  COMPLETED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  SENT: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  PENDING: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  FAILED: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  EXPIRED: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  CANCELLED: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  REVERSED: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
};

function Chip({ status }) {
  const s = String(status || '').toUpperCase();
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[s] || 'border-line text-muted'}`}>
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

function Tabs({ tab, setTab }) {
  const items = [
    ['overview', 'Umumiy'],
    ['wallet', 'Hamyon'],
    ['tools', 'Webhook va test savdo'],
  ];
  return (
    <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
      {items.map(([k, l]) => (
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
  );
}

function Overview({ data, loading, err, reload }) {
  if (loading && !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />)}
      </div>
    );
  }
  if (data && data.configured === false) {
    return <div className="card p-5 text-sm text-rose-400">cs2shop sozlanmagan (CS2SHOP_MERCHANT_ID / CS2SHOP_API_KEY).</div>;
  }
  if (err || data?.error) {
    return (
      <div className="card p-5 text-sm">
        <span className="text-rose-400">Yuklab bo&apos;lmadi: {err || data.error}</span>
        <button onClick={reload} className="btn-ghost ml-3 inline-flex">Qayta urinish</button>
      </div>
    );
  }
  const c = data.counts || {};
  const trades = data.trades || [];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sarflash mumkin" value={usd(data.balance)} sub="Hozir xarid uchun ochiq balans" accent />
        <Stat label="Yechib olish mumkin" value={usd(data.balance)} sub="Payout so'rash mumkin bo'lgan balans" />
        <Stat label="Muzlatilgan" value={usd(data.frozen)} sub="Qo'yib yuborilmaguncha ishlatib bo'lmaydi" />
        <Stat label="Xarid quvvati" value={usd(data.available)} sub="Ochiq balansdan sarflash imkoni" accent />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card p-5">
          <div className="label">So&apos;nggi faollik</div>
          <div className="mt-1 text-lg font-semibold">So&apos;nggi {c.sample || 0} savdo</div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="label">Faol</dt>
              <dd className="mt-1 text-2xl font-bold">{c.active || 0}</dd>
            </div>
            <div>
              <dt className="label">Yakunlangan</dt>
              <dd className="mt-1 text-2xl font-bold text-emerald-300">{c.completed || 0}</dd>
            </div>
            <div>
              <dt className="label">Xato</dt>
              <dd className={`mt-1 text-2xl font-bold ${c.failed ? 'text-rose-400' : ''}`}>{c.failed || 0}</dd>
            </div>
          </dl>

          <div className="mt-5 space-y-2 rounded-xl border border-line p-3 text-xs">
            <div className="flex justify-between gap-3"><span className="text-muted">Merchant ID</span><span className="font-mono">{data.merchantId}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted">Jami savdolar</span><span>{c.total}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted">Katalog manbasi</span><span>{data.skinsSource}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted">Yetkazish</span><span>{data.fulfillProvider}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted">Webhook</span><span className="break-all text-right">{data.webhookUrl}</span></div>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <div className="label">So&apos;nggi ulgurji savdolar</div>
              <div className="mt-1 text-lg font-semibold">Oxirgi faollik</div>
            </div>
            <button onClick={reload} className="btn-ghost inline-flex items-center gap-2">
              <Svg d={Icon.refresh} className="h-4 w-4" />
              Yangilash
            </button>
          </div>
          {trades.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">Hali savdo yo&apos;q.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="border-b border-line text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Savdo ID</th>
                    <th className="px-4 py-3 font-semibold">Buyurtma</th>
                    <th className="px-4 py-3 font-semibold">Holat</th>
                    <th className="px-4 py-3 font-semibold">Yangilangan</th>
                    <th className="px-4 py-3 font-semibold">Sabab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {trades.map((t) => (
                    <tr key={t.tradeId} className="align-top">
                      <td className="px-4 py-3 font-mono text-[11px] text-white/80">{String(t.tradeId).slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <div className="break-all font-mono text-[11px]">{t.externalRef}</div>
                        {t.item && <div className="mt-0.5 text-muted">{t.item}{t.priceUsd != null ? ` · ${usd(t.priceUsd)}` : ''}</div>}
                      </td>
                      <td className="px-4 py-3"><Chip status={t.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(t.updatedAt)}</td>
                      <td className="max-w-[220px] px-4 py-3 text-muted">{t.failReason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WalletTab() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setErr('');
    fetch(`/api/admin/cs2shop?section=wallet&page=${page}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => alive && (d.error ? setErr(d.error) : setData(d)))
      .catch(() => alive && setErr('aloqa xatosi'));
    return () => {
      alive = false;
    };
  }, [page]);

  if (err) return <div className="card p-5 text-sm text-rose-400">Xato: {err}</div>;
  if (!data) return <div className="card h-40 animate-pulse bg-white/[0.03]" />;
  const pages = Math.max(1, Math.ceil((data.total || 0) / 25));
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-line px-5 py-4">
        <div className="label">Hamyon va yozuvlar</div>
        <div className="mt-1 text-sm text-muted">Balansdan oldin → o&apos;zgarish → keyin (USD) · jami {data.total}</div>
      </div>
      {data.transactions.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted">Yozuv yo&apos;q.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-line text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Sana</th>
                <th className="px-4 py-3 font-semibold">Turi</th>
                <th className="px-4 py-3 font-semibold">Oldin</th>
                <th className="px-4 py-3 font-semibold">O&apos;zgarish</th>
                <th className="px-4 py-3 font-semibold">Keyin</th>
                <th className="px-4 py-3 font-semibold">Izoh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.transactions.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{t.type}</td>
                  <td className="px-4 py-3">{usd(t.balanceBefore)}</td>
                  <td className={`px-4 py-3 font-semibold ${t.amount < 0 ? 'text-rose-300' : t.amount > 0 ? 'text-emerald-300' : ''}`}>
                    {t.amount > 0 ? '+' : ''}{usd(t.amount)}
                  </td>
                  <td className="px-4 py-3">{usd(t.balanceAfter)}</td>
                  <td className="px-4 py-3 text-muted">{t.market_hash_name || t.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost disabled:opacity-40">← Oldingi</button>
        <span>{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost disabled:opacity-40">Keyingi →</button>
      </div>
    </div>
  );
}

// Webhook'ni ulash + REAL test savdo
function Tools({ onChanged }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [tradeUrl, setTradeUrl] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [test, setTest] = useState(null); // { ref, item, priceUsd, float, state, detail, error }

  async function connectWebhook() {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/admin/cs2shop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'webhook' }),
      });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok && d.ok ? `Webhook ulandi: ${d.webhookUrl}` : `Xato: ${d.error || r.status}`);
    } catch {
      setMsg('Xato: aloqa');
    } finally {
      setBusy(false);
    }
  }

  async function testBuy() {
    if (!tradeUrl.trim()) return setTest({ error: 'Trade URL kiriting' });
    if (!window.confirm("cs2shop balansidan $2 gacha REAL pul yechiladi va eng arzon skin shu trade-linkka yuboriladi. Davom etamizmi?")) return;
    setTestBusy(true);
    setTest(null);
    try {
      const r = await fetch('/api/admin/cs2shop', {
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
      const r = await fetch(`/api/admin/cs2shop?ref=${encodeURIComponent(test.ref)}`, { cache: 'no-store' });
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
        <div className="label">Webhook</div>
        <p className="mt-2 text-sm text-muted">
          cs2shop savdo holatlarini (SENT, COMPLETED, REVERSED) saytga yuborishi uchun manzilni ro&apos;yxatdan o&apos;tkazing.
        </p>
        <button onClick={connectWebhook} disabled={busy} className="btn-primary mt-4 disabled:opacity-50">
          {busy ? 'Ulanmoqda...' : "Webhook'ni ulash"}
        </button>
        {msg && <div className="mt-3 break-all text-xs text-muted">{msg}</div>}
      </div>

      <div className="card p-5">
        <div className="label">Test savdo</div>
        <p className="mt-2 text-sm text-muted">
          Eng arzon skin ($2 gacha) shu trade-linkka REAL sotib olinadi (cs2shop balansidan yechiladi).
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
                <div className="mt-1 flex items-center gap-2">Holat: <Chip status={test.state} />{test.error && <span className="text-rose-400">{test.error}</span>}</div>
                <button onClick={refreshTest} disabled={testBusy} className="btn-ghost mt-2 disabled:opacity-50">Holatni yangilash</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCs2shop() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    return fetch('/api/admin/cs2shop?section=overview', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr('aloqa xatosi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight">{data?.merchantId || 'cs2shop'}</h2>
        <p className="mt-1 text-sm text-muted">Balans va so&apos;nggi faollik. Ulgurji skin yetkazib beruvchi: cs2shop.</p>
      </div>
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'overview' && <Overview data={data} loading={loading} err={err} reload={load} />}
      {tab === 'wallet' && <WalletTab />}
      {tab === 'tools' && <Tools onChanged={load} />}
    </div>
  );
}
