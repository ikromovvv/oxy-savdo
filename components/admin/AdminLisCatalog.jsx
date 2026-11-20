'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inputCls } from './ui';

// LIS-SKINS katalogi (admin): yetkazib beruvchida hozir bor skinlar — qidiruv, filtr, kategoriya, sahifalash.

const WEAR_OPTIONS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const WEAR_KEY = { 'Factory New': 'FN', 'Minimal Wear': 'MW', 'Field-Tested': 'FT', 'Well-Worn': 'WW', 'Battle-Scarred': 'BS' };
const WEAR_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };
const RARITIES = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert', 'Extraordinary', 'Contraband'];
const TYPES = [
  ['rifle', 'Vintovkalar'], ['sniper', 'Snayperkalar'], ['pistol', 'Pistoletlar'], ['smg', 'SMG'],
  ['heavy', "Og'ir qurol"], ['knife', 'Pichoqlar'], ['gloves', "Qo'lqoplar"],
];
const STEAM_IMG = /steamstatic\.com\/economy\/image\//;

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const int = (n) => Number(n || 0).toLocaleString('en-US');
const thumb = (u) => (u && STEAM_IMG.test(u) && !/\/\d+fx\d+f$/.test(u) ? `${u}/256fx192f` : u);

const DEFAULTS = { query: '', weaponType: 'all', wear: 'all', rarity: 'all', availability: 'all', priceFrom: '', priceTo: '', sort: 'price_desc' };

export default function AdminLisCatalog() {
  const [f, setF] = useState(DEFAULTS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const reqId = useRef(0);
  const topRef = useRef(null);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams({ ...f, page: String(page) });
      const r = await fetch(`/api/admin/lis/catalog?${qs}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (id !== reqId.current) return;
      if (!r.ok || d.error) setErr(d.error || `HTTP ${r.status}`);
      else setData(d);
    } catch {
      if (id === reqId.current) setErr('aloqa xatosi');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [f, page]);

  // filtr o'zgarsa — kutib turib (debounce) yuklaymiz
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const set = (patch) => {
    setF((s) => ({ ...s, ...patch }));
    setPage(1);
  };
  const goPage = (p) => {
    setPage(p);
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const counts = data?.weaponCounts || {};
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabCls = (active) =>
    `flex-none whitespace-nowrap rounded-xl border px-4 py-2 text-left transition ${
      active ? 'border-white bg-white text-ink' : 'border-line text-white/80 hover:border-white/40'
    }`;
  const chip = (active) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-white/60 bg-white/10 text-white' : 'border-line text-white/70 hover:border-white/40'}`;

  return (
    <div ref={topRef}>
      {/* sarlavha + statistika */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">LIS-SKINS katalogi</h3>
          <p className="mt-1 text-sm text-muted">Yetkazib beruvchida hozir mavjud skinlar: narxlar, soni va qulf holatini taqqoslang.</p>
        </div>
        <div className="flex gap-8">
          <div>
            <div className="text-xs text-muted">Topildi (nusxalar)</div>
            <div className="text-3xl font-semibold tracking-tight">{data ? int(data.matched) : '…'}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Taxminiy qiymat</div>
            <div className="text-3xl font-semibold tracking-tight">{data ? usd(data.value) : '…'}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* CHAP: filtrlar (scroll bilan birga yuradi) */}
        <aside className="card admin-scroll w-full flex-none space-y-5 p-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] lg:w-[250px] lg:overflow-y-auto">
          <div>
            <div className="label mb-2">Qidiruv</div>
            <input value={f.query} onChange={(e) => set({ query: e.target.value })} placeholder="Skin nomi bo'yicha" className={inputCls} />
          </div>
          <div>
            <div className="label mb-2">Saralash</div>
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value })} className={inputCls}>
              <option value="price_desc">Narx: qimmatdan arzonga</option>
              <option value="price_asc">Narx: arzondan qimmatga</option>
              <option value="count_desc">Soni: ko&apos;pdan kamga</option>
            </select>
          </div>
          <div>
            <div className="label mb-2">Narx (USD)</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" value={f.priceFrom} onChange={(e) => set({ priceFrom: e.target.value })} placeholder="dan" className={inputCls} />
              <input type="number" inputMode="decimal" value={f.priceTo} onChange={(e) => set({ priceTo: e.target.value })} placeholder="gacha" className={inputCls} />
            </div>
          </div>
          <div>
            <div className="label mb-2">Holati (wear)</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => set({ wear: 'all' })} className={chip(f.wear === 'all')}>Hammasi</button>
              {WEAR_OPTIONS.map((w) => (
                <button
                  key={w}
                  onClick={() => set({ wear: w })}
                  title={w}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={f.wear === w ? { borderColor: `${WEAR_COLOR[WEAR_KEY[w]]}99`, background: `${WEAR_COLOR[WEAR_KEY[w]]}22`, color: WEAR_COLOR[WEAR_KEY[w]] } : { borderColor: '#1E1E21', color: 'rgba(255,255,255,0.7)' }}
                >
                  {WEAR_KEY[w]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label mb-2">Rariteti</div>
            <select value={f.rarity} onChange={(e) => set({ rarity: e.target.value })} className={inputCls}>
              <option value="all">Hammasi</option>
              {RARITIES.map((r) => <option key={r} value={r}>{r.replace(' Grade', '')}</option>)}
            </select>
          </div>
          <div>
            <div className="label mb-2">Mavjudlik</div>
            <select value={f.availability} onChange={(e) => set({ availability: e.target.value })} className={inputCls}>
              <option value="all">Hammasi</option>
              <option value="unlocked">Qulfsiz nusxasi bor</option>
              <option value="locked">Faqat qulfli (kutish kerak)</option>
            </select>
          </div>
          <button onClick={() => { setF(DEFAULTS); setPage(1); }} className="w-full rounded-xl border border-line py-2.5 text-sm transition hover:border-white/40">
            Filtrlarni tozalash
          </button>
        </aside>

        {/* O'NG: kategoriyalar + kartalar */}
        <div className="min-w-0 flex-1">
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => set({ weaponType: 'all' })} className={tabCls(f.weaponType === 'all')}>
              <div className="text-sm font-medium">Hammasi</div>
              <div className={`text-[11px] ${f.weaponType === 'all' ? 'text-ink/60' : 'text-muted'}`}>{data ? int(allCount) : '–'}</div>
            </button>
            {TYPES.map(([slug, label]) => (
              <button key={slug} onClick={() => set({ weaponType: slug })} className={tabCls(f.weaponType === slug)}>
                <div className="text-sm font-medium">{label}</div>
                <div className={`text-[11px] ${f.weaponType === slug ? 'text-ink/60' : 'text-muted'}`}>{data ? int(counts[slug] || 0) : '–'}</div>
              </button>
            ))}
          </div>

          {err ? (
            <div className="card p-6 text-sm">
              <span className="text-rose-400">Yuklab bo&apos;lmadi: {err}</span>
              <button onClick={load} className="btn-ghost ml-3 inline-flex">Qayta urinish</button>
            </div>
          ) : !data ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-64 animate-pulse bg-white/[0.04]" />)}
            </div>
          ) : data.items.length === 0 ? (
            <div className="card p-10 text-center text-sm text-muted">Bu filtr bo&apos;yicha skin topilmadi.</div>
          ) : (
            <>
              <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
                {data.items.map((it) => {
                  const wk = WEAR_KEY[it.wear];
                  return (
                    <div key={it.name} className="card group flex flex-col overflow-hidden p-0">
                      <div className="relative bg-gradient-to-b from-white/[0.05] to-transparent px-3 pt-3">
                        {it.wear && (
                          <span className="absolute right-3 top-3 z-10 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: `${WEAR_COLOR[wk]}80`, color: WEAR_COLOR[wk], background: `${WEAR_COLOR[wk]}18` }}>
                            {it.wear}
                          </span>
                        )}
                        {it.stattrak && <span className="absolute left-3 top-3 z-10 rounded-md border border-line bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-accent">ST™</span>}
                        <div className="grid aspect-[4/3] place-items-center">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb(it.image)} alt={it.baseName} loading="lazy" decoding="async" className="h-full w-full object-contain p-2" />
                          ) : (
                            <span className="px-4 text-center text-sm text-white/60">{it.baseName}</span>
                          )}
                        </div>
                        <div className="-mt-5 mb-1 flex">
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-ink shadow-lg">{usd(it.price)}</span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                        <div className="text-sm font-semibold leading-snug">{it.baseName}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                          <span>{int(it.count)} ta mavjud</span>
                          {it.unlocked ? (
                            <span className="text-emerald-300">Qulfsiz bor</span>
                          ) : (
                            <span className="text-amber-300">Faqat qulfli</span>
                          )}
                          {it.unlocked && it.lockedPrice && it.lockedPrice < it.price && <span>qulfli {usd(it.lockedPrice)} dan</span>}
                        </div>
                        {it.url && (
                          <a href={it.url} target="_blank" rel="noopener noreferrer" className="mt-2 w-fit text-[11px] text-muted underline-offset-2 hover:text-white hover:underline">
                            LIS&apos;da ochish ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between text-xs text-muted">
                <button disabled={data.page <= 1} onClick={() => goPage(data.page - 1)} className="btn-ghost disabled:opacity-40">← Oldingi</button>
                <span>Sahifa {int(data.page)} / {int(data.pages)} · {int(data.total)} ta skin nomi</span>
                <button disabled={data.page >= data.pages} onClick={() => goPage(data.page + 1)} className="btn-ghost disabled:opacity-40">Keyingi →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
