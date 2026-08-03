'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import SteamLoginGate from '@/components/SteamLoginGate';

const EXTERIOR_SHORT = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

export default function SotishPage() {
  const { t, user, userLoading } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('price_desc');
  const [selected, setSelected] = useState(() => new Set());
  const [payout, setPayout] = useState('balance');
  const [contact, setContact] = useState({ phone: '', tg: '' });
  const [step, setStep] = useState('list'); // list | sending | ok | err

  useEffect(() => {
    if (!user) return;
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadInventory() {
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    setSelected(new Set());
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setErrorDetail(data.detail || (data.status ? `HTTP ${data.status}` : null));
        setItems([]);
      } else {
        setItems(data.items || []);
      }
    } catch (e) {
      setError('fetch_failed');
      setErrorDetail(e?.message || null);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = items.filter((i) => i.marketable);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const pa = a.price ?? -1;
      const pb = b.price ?? -1;
      return sort === 'price_asc' ? pa - pb : pb - pa;
    });
  }, [items, query, sort]);

  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.assetid)), [items, selected]);
  const total = selectedItems.reduce((s, i) => s + (i.price || 0), 0);

  function toggle(it) {
    if (it.price == null) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(it.assetid)) next.delete(it.assetid);
      else next.add(it.assetid);
      return next;
    });
  }

  function selectAll() {
    const sellable = filtered.filter((i) => i.price != null).map((i) => i.assetid);
    const allSelected = sellable.length > 0 && sellable.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(sellable));
  }

  async function submit(e) {
    e.preventDefault();
    setStep('sending');
    try {
      const res = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({ name: i.name, exterior: i.exterior, price: i.price })),
          total,
          payout,
          contact,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setStep('ok');
    } catch {
      setStep('err');
    }
  }

  // Steam bilan kirilmagan — orqa fonda xira (blur) katalog, markazda avtorizatsiya oynasi
  if (!userLoading && !user) {
    return <SteamLoginGate title={t('sell_title')} />;
  }

  if (step === 'ok') {
    return (
      <section className="container-site flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <div className="text-2xl font-semibold">{t('sell_ok_title')}</div>
        <p className="mt-2 max-w-sm text-sm text-muted">{t('sell_ok_text')}</p>
        <button
          onClick={() => {
            setStep('list');
            loadInventory();
          }}
          className="btn-primary mt-8"
        >
          {t('sell_title')}
        </button>
      </section>
    );
  }

  return (
    <section className="container-site py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label">{t('nav_sell')}</span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('sell_title')}</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">{t('sell_subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* CHAP: TOOLBAR + GRID */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={loadInventory}
              title={t('sell_refresh')}
              className="grid h-10 w-10 place-items-center rounded-full border border-line transition hover:border-white/40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('sell_search_ph')}
              className="min-w-[180px] flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
            />

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-full border border-line bg-panel px-4 py-2.5 text-sm outline-none focus:border-white/40"
            >
              <option value="price_desc">{t('sell_sort_price')} ↓</option>
              <option value="price_asc">{t('sell_sort_price')} ↑</option>
            </select>

            <button
              onClick={selectAll}
              className="rounded-full border border-line px-4 py-2.5 text-sm transition hover:border-white/40"
            >
              {t('sell_select_all')}
            </button>
          </div>

          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card aspect-[3/4] animate-pulse bg-white/5" />
              ))}
            </div>
          )}

          {!loading && error === 'private' && (
            <div className="card mx-auto max-w-lg p-8 text-left">
              <p className="text-center text-sm font-medium text-white/85">{t('sell_private')}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">
                <li>{t('sell_private_reason1')}</li>
                <li>{t('sell_private_reason2')}</li>
              </ul>

              <div className="mt-6 border-t border-line pt-5">
                <ol className="space-y-2 text-xs text-white/80">
                  {[
                    t('sell_private_step1'),
                    t('sell_private_step2'),
                    t('sell_private_step3'),
                    t('sell_private_step4'),
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-white/10 text-[10px] font-semibold">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <a
                  href="https://steamcommunity.com/my/edit/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  Steam
                </a>
                <button onClick={loadInventory} className="btn-primary">
                  {t('sell_refresh')}
                </button>
              </div>

              {errorDetail && (
                <p className="mt-4 break-all text-center font-mono text-[11px] text-muted/50">{errorDetail}</p>
              )}
            </div>
          )}

          {!loading && error && error !== 'private' && (
            <div className="card p-8 text-center">
              <p className="text-sm text-white/85">
                {error === 'rate_limited'
                  ? t('sell_rate_limited')
                  : error === 'network_error'
                  ? t('sell_network_error')
                  : t('sell_error')}
              </p>
              <button onClick={loadInventory} className="btn-ghost mt-5">
                {t('sell_refresh')}
              </button>
              {errorDetail && (
                <p className="mt-4 break-all font-mono text-[11px] text-muted/70">{errorDetail}</p>
              )}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">{t('sell_empty')}</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((it) => {
                const isSelected = selected.has(it.assetid);
                const sellable = it.price != null;
                return (
                  <button
                    key={it.assetid}
                    type="button"
                    onClick={() => toggle(it)}
                    disabled={!sellable}
                    className={`card relative flex flex-col overflow-hidden p-3 text-left transition ${
                      isSelected ? 'border-accent ring-1 ring-accent' : 'hover:border-white/30'
                    } ${!sellable ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    {it.exterior && (
                      <span className="absolute left-2 top-2 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                        {EXTERIOR_SHORT[it.exterior] || it.exterior}
                      </span>
                    )}
                    <span
                      className={`absolute right-2 top-2 z-10 grid h-5 w-5 place-items-center rounded-full border text-[11px] ${
                        isSelected ? 'border-accent bg-accent text-ink' : 'border-line text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <div className="mt-4 flex aspect-square items-center justify-center">
                      {it.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.icon} alt={it.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <div className="h-16 w-16 rounded bg-white/5" />
                      )}
                    </div>
                    <div className="mt-2 truncate text-xs text-white/80">{it.name}</div>
                    <div className="mt-1 text-sm font-semibold">
                      {sellable ? `$${it.price.toFixed(2)}` : t('sell_price_unknown')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* O'NG: SAVATCHA / SO'ROV */}
        <aside className="card sticky top-20 flex w-full flex-col gap-5 p-5 lg:w-[340px]">
          <div className="flex items-center justify-between">
            <span className="label">{t('sell_selected')}</span>
            <span className="text-sm font-medium">{selectedItems.length}</span>
          </div>

          <div className="flex items-center justify-between border-y border-line py-3">
            <span className="label">{t('sell_total')}</span>
            <span className="text-xl font-semibold">${total.toFixed(2)}</span>
          </div>

          <div>
            <div className="label mb-2">{t('sell_payout_method')}</div>
            <div className="grid grid-cols-3 gap-2">
              {['balance', 'cards', 'crypto'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPayout(p)}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                    payout === p ? 'border-accent text-white' : 'border-line text-muted hover:text-white'
                  }`}
                >
                  {t(`sell_${p}`)}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="label">{t('sell_contact_title')}</div>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
            />
            <input
              type="text"
              placeholder="@username"
              value={contact.tg}
              onChange={(e) => setContact({ ...contact, tg: e.target.value })}
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
            />
            <p className="text-[11px] text-muted">{t('sell_min_hint')}</p>

            {step === 'err' && <p className="text-[11px] text-red-400">{t('sell_error')}</p>}

            <button
              type="submit"
              disabled={!selectedItems.length || (!contact.phone && !contact.tg) || step === 'sending'}
              className="btn-primary w-full disabled:opacity-40"
            >
              {step === 'sending' ? t('sell_sending') : t('sell_submit')}
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}
