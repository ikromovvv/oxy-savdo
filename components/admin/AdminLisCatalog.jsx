'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inputCls } from './ui';
import { toast } from './Toast';

// LIS-SKINS katalogi (admin, to'liq ekran): yetkazib beruvchida hozir bor skinlar.
// Kartani bossangiz — trade-URL modali ochiladi; tasdiqlansa skin (qulfsiz eng arzon nusxa)
// shu havolaga darhol sotib olinib yuboriladi (admin qo'lda sotgan mijoz uchun).

const WEAR_OPTIONS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const WEAR_KEY = { 'Factory New': 'FN', 'Minimal Wear': 'MW', 'Field-Tested': 'FT', 'Well-Worn': 'WW', 'Battle-Scarred': 'BS' };
const WEAR_COLOR = { FN: '#22c55e', MW: '#a3e635', FT: '#eab308', WW: '#f97316', BS: '#ef4444' };
const RARITIES = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert', 'Extraordinary', 'Contraband'];
const TYPES = [
  ['rifle', 'Vintovkalar'], ['sniper', 'Snayperkalar'], ['pistol', 'Pistoletlar'], ['smg', 'SMG'],
  ['heavy', "Og'ir qurol"], ['knife', 'Pichoqlar'], ['gloves', "Qo'lqoplar"],
];
const STEAM_IMG = /steamstatic\.com\/economy\/image\//;
const TRADE_KEY = 'oxy:adminTradeUrl';
const TRADE_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[A-Za-z0-9_-]+$/;

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const int = (n) => Number(n || 0).toLocaleString('en-US');
const thumb = (u) => (u && STEAM_IMG.test(u) && !/\/\d+fx\d+f$/.test(u) ? `${u}/256fx192f` : u);

const DEFAULTS = { query: '', weaponType: 'all', wear: 'all', rarity: 'all', availability: 'all', priceFrom: '', priceTo: '', sort: 'price_desc' };

// Trade-URL modali + xarid natijasi
function BuyModal({ item, balance, onClose, onBought }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null); // { ok, ref, item, priceUsd, float, state, notified, error }
  const [st, setSt] = useState(null);

  useEffect(() => {
    try {
      setUrl(localStorage.getItem(TRADE_KEY) || ''); // saqlangan havola — faqat to'ldiriladi, tasdiqlashsiz yuborilmaydi
    } catch {}
  }, []);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy, onClose]);

  const valid = TRADE_RE.test(url.trim());
  const short = balance != null && item.price > balance; // balans yetmaydi

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setRes(null);
    try {
      localStorage.setItem(TRADE_KEY, url.trim());
    } catch {}
    try {
      const r = await fetch('/api/admin/lis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'catalog_buy', name: item.name, tradeUrl: url.trim(), expectedUsd: item.price }),
      });
      const d = await r.json().catch(() => ({}));
      setRes(r.ok && d.ok ? d : { ok: false, error: d.error || `HTTP ${r.status}` });
      if (r.ok && d.ok) {
        onBought?.();
        toast.success(`Buyurtma yuborildi: ${item.name}`);
      } else toast.error(d.error || `HTTP ${r.status}`);
    } catch {
      setRes({ ok: false, error: 'aloqa xatosi' });
      toast.error('Aloqa xatosi: server javob bermadi');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!res?.ref) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/lis?ref=${encodeURIComponent(res.ref)}`, { cache: 'no-store' });
      setSt(await r.json().catch(() => null));
    } finally {
      setBusy(false);
    }
  }

  const done = res?.ok;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl rounded-2xl border border-line bg-panel p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="label">Trade manzili</div>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight">Qabul qiluvchi Steam trade URL</h3>

        {!done ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Skin shu yerda tasdiqlagan trade URL&apos;ga yuboriladi. Saqlangan havola oldindan to&apos;ldirilishi mumkin, lekin tasdiqlamasdan hech qachon yuborilmaydi.
            </p>

            <div className="mt-5 rounded-xl border border-line p-3 text-sm">
              <div>Skin: <b>{item.name}</b></div>
              <div className="mt-1 text-muted">
                Katalog narxi <b className="text-white">{usd(item.price)}</b> · LIS balansidan yechiladi · qulfsiz eng arzon nusxa olinadi
              </div>
            </div>

            <label className="mt-5 block text-xs text-muted">Receiving trade URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
              autoFocus
              className={`${inputCls} mt-1.5`}
            />
            {url.trim() && !valid && <div className="mt-1.5 text-xs text-amber-300">Havola shaklda: …/tradeoffer/new/?partner=…&token=…</div>}
            {short && <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">LIS balansi yetarli emas: {usd(balance)} &lt; {usd(item.price)}. Avval balansni to&apos;ldiring.</div>}
            {res && !res.ok && <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{res.error}</div>}

            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={onClose} disabled={busy} className="btn-ghost disabled:opacity-50">Bekor qilish</button>
              <button onClick={submit} disabled={!valid || busy || short} className="btn-primary disabled:opacity-40">
                {busy ? 'Sotib olinmoqda…' : 'Sotib olish va yuborish'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
              <div className="font-semibold text-emerald-200">Xarid qilindi, trade offer yuborilmoqda</div>
              <div className="mt-2 font-mono text-xs text-white/90">{res.ref}</div>
              <div className="mt-1">{res.item} · {usd(res.priceUsd)}{res.float != null ? ` · float ${Number(res.float).toFixed(5)}` : ''}</div>
              <div className="mt-1 text-muted">Holat: <b className="text-white">{st?.state || res.state || '—'}</b>{st?.error ? ` · ${st.error}` : ''}</div>
              {res.notified === false && <div className="mt-1 text-amber-300">Guruhga xabar ketmadi: {res.notifyError}</div>}
            </div>
            <p className="mt-3 text-xs text-muted">Offer Steam&apos;da qabul qiluvchida paydo bo&apos;ladi. Holatni &quot;Umumiy&quot; bo&apos;limida ham ko&apos;rasiz.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={refresh} disabled={busy} className="btn-ghost disabled:opacity-50">Holatni yangilash</button>
              <button onClick={onClose} className="btn-primary">Yopish</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminLisCatalog({ onBack }) {
  const [f, setF] = useState(DEFAULTS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [buying, setBuying] = useState(null);
  const [bal, setBal] = useState({ loading: true, value: null, error: '' });
  const reqId = useRef(0);

  const loadBalance = useCallback(async () => {
    setBal((b) => ({ ...b, loading: true, error: '' }));
    try {
      const r = await fetch('/api/admin/lis?section=balance', { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error || d.configured === false) {
        setBal({ loading: false, value: null, error: d.configured === false ? 'kalit yoq' : d.error || `HTTP ${r.status}` });
      } else {
        setBal({ loading: false, value: Number(d.available ?? d.balance) || 0, error: '' });
      }
    } catch {
      setBal({ loading: false, value: null, error: 'aloqa xatosi' });
    }
  }, []);
  useEffect(() => {
    loadBalance();
  }, [loadBalance]);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams({ ...f, page: String(page) });
      const r = await fetch(`/api/admin/lis/catalog?${qs}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (id !== reqId.current) return;
      if (!r.ok || d.error) {
        const m = [d.error || `HTTP ${r.status}`, d.detail].filter(Boolean).join(' — ');
        setErr(m);
        toast.error(`Katalog yuklanmadi: ${m}`);
      }
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

  // Esc — to'liq ekrandan chiqish (modal ochiq bo'lmaganda)
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && !buying && onBack?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [buying, onBack]);

  const set = (patch) => {
    setF((s) => ({ ...s, ...patch }));
    setPage(1);
  };
  const goPage = (p) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
    // To'liq ekran: admin menyusi va sarlavhasi ustini yopadi — katalog kattaroq ko'rinadi
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink text-white">
      <header className="flex h-14 flex-none items-center gap-3 border-b border-line px-4 md:px-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm transition hover:border-white/40">
          ← Orqaga
        </button>
        <h3 className="text-base font-semibold tracking-tight">LIS-SKINS katalogi</h3>
        <div className="ml-auto flex items-center gap-6">
          <button
            onClick={loadBalance}
            title={bal.error ? `Balansni o'qib bo'lmadi: ${bal.error}. Bosing — qayta urinish` : 'LIS balansi. Bosing — yangilash'}
            className="rounded-xl border border-line px-3 py-1.5 text-right transition hover:border-white/40"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted">LIS balansi</div>
            <div className={`text-lg font-semibold leading-tight ${bal.error ? 'text-rose-400' : bal.value != null && bal.value < 20 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {bal.loading && bal.value == null ? '…' : bal.value != null ? usd(bal.value) : '—'}
            </div>
          </button>
          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-wider text-muted">Topildi (nusxalar)</div>
            <div className="text-lg font-semibold leading-tight">{data ? int(data.matched) : '…'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted">Taxminiy qiymat</div>
            <div className="text-lg font-semibold leading-tight">{data ? usd(data.value) : '…'}</div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="admin-scroll min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* CHAP: filtrlar (scroll bilan birga yuradi) */}
          <aside className="card admin-scroll w-full flex-none space-y-5 p-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-6.5rem)] lg:w-[250px] lg:overflow-y-auto">
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
            {/* TEZ FILTRLAR: balansga mos eng yaxshi skinlar va tayyor narx oraliqlari */}
            <div className="no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="flex-none text-[11px] uppercase tracking-wider text-muted">Tez filtr:</span>
              {(() => {
                const budget = bal.value != null && bal.value >= 1 ? Math.floor(bal.value * 100) / 100 : null;
                const isBudget = budget != null && String(f.priceTo) === String(budget) && f.priceFrom === '' && f.sort === 'price_desc' && f.availability === 'unlocked';
                const base = { priceFrom: '', priceTo: '', availability: 'unlocked', sort: 'price_desc', weaponType: 'all', wear: 'all', rarity: 'all', query: '' };
                const presets = [
                  { key: 'b5', label: '≤ $5', patch: { ...base, priceTo: '5' } },
                  { key: 'b20', label: '≤ $20', patch: { ...base, priceTo: '20' } },
                  { key: 'b100', label: '≤ $100', patch: { ...base, priceTo: '100' } },
                  { key: 'm', label: '$100–500', patch: { ...base, priceFrom: '100', priceTo: '500' } },
                  { key: 'h', label: '$500+', patch: { ...base, priceFrom: '500' } },
                  { key: 'pop', label: "Ko'p mavjud", patch: { ...base, sort: 'count_desc' } },
                ];
                const same = (p) => ['priceFrom', 'priceTo', 'sort', 'availability'].every((k) => String(f[k]) === String(p[k]));
                return (
                  <>
                    <button
                      disabled={budget == null}
                      onClick={() => set({ ...base, priceTo: String(budget) })}
                      title={budget == null ? "Balans noma'lum yoki $1 dan kam" : `Balansga mos: ${usd(budget)} gacha, qulfsiz, eng yaxshi (qimmat) skinlar oldinda`}
                      className={`flex-none whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${isBudget ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'}`}
                    >
                      💰 Balansga mos{budget != null ? ` (${usd(budget)} gacha)` : ''}
                    </button>
                    {presets.map((p) => (
                      <button key={p.key} onClick={() => set(p.patch)} className={`flex-none whitespace-nowrap ${chip(same(p.patch) && !isBudget)}`}>
                        {p.label}
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>

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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => <div key={i} className="card h-64 animate-pulse bg-white/[0.04]" />)}
              </div>
            ) : data.items.length === 0 ? (
              <div className="card p-10 text-center text-sm text-muted">Bu filtr bo&apos;yicha skin topilmadi.</div>
            ) : (
              <>
                <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
                  {data.items.map((it) => {
                    const wk = WEAR_KEY[it.wear];
                    const afford = bal.value == null || it.price <= bal.value;
                    const canBuy = it.unlocked;
                    return (
                      <div
                        key={it.name}
                        role="button"
                        tabIndex={canBuy ? 0 : -1}
                        onClick={() => canBuy && setBuying(it)}
                        onKeyDown={(e) => canBuy && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setBuying(it))}
                        title={canBuy ? "Bosing: trade-linkka yuborish" : "Qulfsiz nusxa yo'q — hozir sotib olib bo'lmaydi"}
                        className={`card group flex flex-col overflow-hidden p-0 outline-none transition ${canBuy ? 'cursor-pointer hover:-translate-y-0.5 hover:border-white/30 focus-visible:border-white/50' : 'cursor-not-allowed opacity-70'}`}
                      >
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
                            {!afford && <span className="ml-2 self-center text-[10px] font-semibold uppercase tracking-wide text-amber-300">Balans yetmaydi</span>}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                          <div className="text-sm font-semibold leading-snug">{it.baseName}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                            <span>{int(it.count)} ta mavjud</span>
                            {it.unlocked ? <span className="text-emerald-300">Qulfsiz bor</span> : <span className="text-amber-300">Faqat qulfli</span>}
                            {it.unlocked && it.lockedPrice && it.lockedPrice < it.price && <span>qulfli {usd(it.lockedPrice)} dan</span>}
                          </div>
                          {it.url && (
                            <a href={it.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 w-fit text-[11px] text-muted underline-offset-2 hover:text-white hover:underline">
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

      {buying && <BuyModal item={buying} balance={bal.value} onClose={() => setBuying(null)} onBought={loadBalance} />}
    </div>
  );
}
