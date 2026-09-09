'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/products';
import { Icon, Svg, inputCls, labelCls } from './ui';

const CATEGORIES = [
  { slug: 'kovriklar', label: 'Kovriklar' },
  { slug: 'aksessuar', label: 'Aksessuarlar' },
];

const TONES = [
  { v: 'from-white/10 to-black', label: 'Neytral' },
  { v: 'from-zinc-500/25 to-black', label: 'Kulrang' },
  { v: 'from-cyan-500/25 to-black', label: 'Moviy' },
  { v: 'from-emerald-500/25 to-black', label: 'Yashil' },
  { v: 'from-fuchsia-500/25 to-black', label: 'Pushti' },
  { v: 'from-indigo-500/25 to-black', label: 'Indigo' },
  { v: 'from-sky-500/25 to-black', label: 'Osmon' },
  { v: 'from-rose-500/25 to-black', label: 'Qizil' },
];

function emptyForm(category = 'kovriklar') {
  return {
    id: null, name: '', category, price: '', tone: 'from-white/10 to-black',
    image: '', imagesText: '', shortUz: '', shortRu: '', badgeUz: '', badgeRu: '',
    featured: false, specs: [],
  };
}
function toForm(p) {
  return {
    id: p.id, name: p.name || '', category: p.category || 'kovriklar',
    price: String(p.price ?? ''), tone: p.tone || 'from-white/10 to-black',
    image: p.image || (p.images && p.images[0]) || '',
    imagesText: (p.images || []).join('\n'),
    shortUz: p.short?.uz || '', shortRu: p.short?.ru || '',
    badgeUz: p.badge?.uz || '', badgeRu: p.badge?.ru || '',
    featured: Boolean(p.featured),
    specs: (p.specs || []).map((s) => ({ uz: s.uz || '', ru: s.ru || '', v: s.v || '' })),
  };
}
function fromForm(f) {
  const images = f.imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
  if (f.image && !images.includes(f.image.trim())) images.unshift(f.image.trim());
  return {
    id: f.id || undefined, name: f.name, category: f.category, price: f.price, tone: f.tone,
    image: images[0] || '', images,
    short: { uz: f.shortUz, ru: f.shortRu || f.shortUz },
    badge: f.badgeUz || f.badgeRu ? { uz: f.badgeUz, ru: f.badgeRu || f.badgeUz } : null,
    featured: f.featured,
    specs: f.specs
      .map((s) => ({ uz: s.uz.trim(), ru: (s.ru || s.uz).trim(), v: s.v.trim() }))
      .filter((s) => s.uz || s.v),
  };
}

export default function AdminProducts({ onToast, registerNewAction }) {
  const [tab, setTab] = useState('kovriklar');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const mainFileRef = useRef(null);
  const galleryFileRef = useRef(null);
  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch(`/api/products?category=${tab}`, { cache: 'no-store' });
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setErr('Ro\'yxatni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    document.body.style.overflow = form ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [form]);

  const openCreate = useCallback(() => { setFormErr(''); setForm(emptyForm(tab)); }, [tab]);
  useEffect(() => { registerNewAction?.(openCreate); }, [registerNewAction, openCreate]);

  function openEdit(p) { setFormErr(''); setForm(toForm(p)); }

  async function uploadFiles(fileList, target) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setFormErr('');
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (!r.ok || !d.url) throw new Error(d.error || 'Yuklab bo\'lmadi');
        setForm((f) => {
          if (target === 'main') return { ...f, image: d.url };
          const lines = f.imagesText ? f.imagesText.split('\n') : [];
          return { ...f, imagesText: [...lines, d.url].filter(Boolean).join('\n') };
        });
      }
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setUploading(false);
      if (mainFileRef.current) mainFileRef.current.value = '';
      if (galleryFileRef.current) galleryFileRef.current.value = '';
    }
  }

  async function saveForm(e) {
    e.preventDefault();
    setSaving(true);
    setFormErr('');
    const payload = fromForm(form);
    const isEdit = Boolean(form.id);
    try {
      const r = await fetch(isEdit ? `/api/products/${form.id}` : '/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Saqlab bo\'lmadi');
      setForm(null);
      onToast?.(isEdit ? 'Saqlandi' : 'Qo\'shildi');
      if (payload.category !== tab) setTab(payload.category);
      else load();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id) {
    try {
      const r = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'O\'chirib bo\'lmadi');
      setConfirmId(null);
      onToast?.('O\'chirildi');
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => { setTab(c.slug); setConfirmId(null); }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                tab === c.slug ? 'border-white bg-white text-ink' : 'border-line text-white/80 hover:border-white/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="btn-primary px-4 py-2 text-sm">
          <Svg d={Icon.plus} className="h-4 w-4" />
          Yangi mahsulot
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        {/* jadval sarlavhasi (faqat desktop) */}
        <div className="hidden grid-cols-[64px_1fr_140px_120px_120px] gap-3 border-b border-line bg-panel/60 px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted md:grid">
          <span />
          <span>Nomi</span>
          <span>Narx</span>
          <span>Holat</span>
          <span className="text-right">Amallar</span>
        </div>

        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[68px] animate-pulse bg-white/[0.03]" />
            ))}
          </div>
        ) : err ? (
          <div className="p-8 text-center text-sm text-rose-400">{err}</div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-3 p-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line text-muted">
              <Svg d={Icon.box} className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted">Bu bo&apos;limda mahsulot yo&apos;q.</p>
            <button onClick={openCreate} className="btn-ghost mt-1">Yangi qo&apos;shish</button>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[56px_1fr] items-center gap-3 px-3 py-3 transition hover:bg-white/[0.02] md:grid-cols-[64px_1fr_140px_120px_120px] md:px-4"
              >
                <div className={`aspect-square w-14 flex-none overflow-hidden rounded-lg bg-gradient-to-br md:w-16 ${p.tone || 'from-white/10 to-black'}`}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" draggable={false} />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-muted md:hidden">
                    {formatPrice(p.price || 0)} · {p.short?.uz || '—'}
                  </div>
                  <div className="mt-0.5 hidden line-clamp-1 text-xs text-muted md:block">{p.short?.uz || '—'}</div>
                </div>

                <div className="hidden text-sm font-semibold md:block">{formatPrice(p.price || 0)}</div>

                <div className="hidden flex-wrap gap-1 md:flex">
                  {p.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-ink">
                      <Svg d={Icon.star} className="h-2.5 w-2.5" /> TOP
                    </span>
                  )}
                  {p.badge?.uz && (
                    <span className="rounded-full border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted">
                      {p.badge.uz}
                    </span>
                  )}
                  {!p.featured && !p.badge?.uz && <span className="text-xs text-muted">—</span>}
                </div>

                <div className="col-start-2 mt-1.5 flex items-center gap-1.5 md:col-start-auto md:mt-0 md:justify-end">
                  {confirmId === p.id ? (
                    <>
                      <button onClick={() => doDelete(p.id)} className="rounded-full bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500">
                        O&apos;chir
                      </button>
                      <button onClick={() => setConfirmId(null)} aria-label="Bekor" className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted hover:text-white">
                        <Svg d={Icon.close} className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => openEdit(p)} aria-label="Tahrirlash" className="grid h-8 w-8 place-items-center rounded-full border border-line text-white/85 hover:border-white/40">
                        <Svg d={Icon.edit} className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmId(p.id)} aria-label="O'chirish" className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted hover:border-rose-500/60 hover:text-rose-400">
                        <Svg d={Icon.trash} className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* modal */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-black/75 backdrop-blur-md sm:items-start sm:p-6 md:p-8"
          onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}
        >
          <form onSubmit={saveForm} className="card flex w-full max-w-2xl flex-col overflow-hidden rounded-none border-x-0 sm:my-2 sm:rounded-2xl sm:border-x">
            <div className="flex flex-none items-center justify-between border-b border-line px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <span className="label">{form.category === 'kovriklar' ? 'Kovrik' : 'Aksessuar'}</span>
                <h2 className="mt-0.5 truncate text-base font-bold tracking-tight sm:text-lg">
                  {form.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
                </h2>
              </div>
              <button type="button" onClick={() => setForm(null)} aria-label="Yopish" className="grid h-8 w-8 flex-none place-items-center rounded-full border border-line text-muted hover:text-white">
                <Svg d={Icon.close} className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[68vh] sm:flex-none sm:px-6 sm:py-5">
              <div className="label border-b border-line pb-2">Asosiy</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nomi *</label>
                  <input value={form.name} onChange={(e) => setF({ name: e.target.value })} placeholder="OXY Darkness XL" className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Kategoriya *</label>
                  <select value={form.category} onChange={(e) => setF({ category: e.target.value })} className={inputCls}>
                    {CATEGORIES.map((c) => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Narx (so&apos;m) *</label>
                  <input type="number" inputMode="numeric" min="0" value={form.price} onChange={(e) => setF({ price: e.target.value })} placeholder="420000" className={inputCls} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Qisqa tavsif (UZ)</label>
                  <textarea value={form.shortUz} onChange={(e) => setF({ shortUz: e.target.value })} rows={2} placeholder="Aniqlik va barqarorlikni qadrlaydiganlar uchun…" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Qisqa tavsif (RU)</label>
                  <textarea value={form.shortRu} onChange={(e) => setF({ shortRu: e.target.value })} rows={2} placeholder="Bo'sh qoldirilsa — UZ matni ishlatiladi" className={inputCls} />
                </div>
              </div>

              <div className="label mt-8 border-b border-line pb-2">Rasmlar</div>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className={labelCls}>Asosiy rasm (URL)</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={form.image} onChange={(e) => setF({ image: e.target.value })} placeholder="https://… yoki /products/nom.jpg" className={`${inputCls} min-w-[160px] flex-1`} />
                    <label className="btn-ghost cursor-pointer whitespace-nowrap px-4 py-2.5 text-xs">
                      {uploading ? 'Yuklanmoqda…' : 'Fayl'}
                      <input ref={mainFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFiles(e.target.files, 'main')} />
                    </label>
                  </div>
                  <div className={`mt-3 grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-xl border border-line bg-gradient-to-br ${form.tone}`}>
                    {form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.image} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-muted"><Svg d={Icon.image} className="h-4 w-4" /> Rasm ko&apos;rinishi</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Galereya rasmlari (har qatorda bitta URL)</label>
                  <textarea value={form.imagesText} onChange={(e) => setF({ imagesText: e.target.value })} rows={3} placeholder={'/products/nom-1.jpg\n/products/nom-2.jpg'} className={`${inputCls} font-mono text-xs`} />
                  <label className="btn-ghost mt-2 inline-flex cursor-pointer px-4 py-2 text-xs">
                    {uploading ? 'Yuklanmoqda…' : '+ Rasm(lar) yuklash'}
                    <input ref={galleryFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files, 'gallery')} />
                  </label>
                </div>
              </div>

              <div className="label mt-8 border-b border-line pb-2">Ko&apos;rinish</div>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className={labelCls}>Fon rangi (rasm bo&apos;lmaganda)</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((tn) => (
                      <button type="button" key={tn.v} onClick={() => setF({ tone: tn.v })} title={tn.label}
                        className={`relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br transition ${tn.v} ${
                          form.tone === tn.v ? 'ring-2 ring-accent' : 'ring-1 ring-line hover:ring-white/30'
                        }`}>
                        {form.tone === tn.v && <Svg d={Icon.check} className="h-4 w-4 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Nishon / Badge (UZ)</label>
                    <input value={form.badgeUz} onChange={(e) => setF({ badgeUz: e.target.value })} placeholder="Bestseller" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Nishon / Badge (RU)</label>
                    <input value={form.badgeRu} onChange={(e) => setF({ badgeRu: e.target.value })} placeholder="Бестселлер" className={inputCls} />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ink px-3 py-3 text-sm text-white/85">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setF({ featured: e.target.checked })} className="h-4 w-4 flex-none accent-accent" />
                  Bosh sahifada “Tanlangan mahsulot” sifatida ko&apos;rsatilsin
                </label>
              </div>

              <div className="label mt-8 border-b border-line pb-2">Xususiyatlar</div>
              <div className="mt-4 grid gap-2">
                {form.specs.map((s, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:border-0 sm:p-0">
                    <input value={s.uz} onChange={(e) => { const specs = [...form.specs]; specs[i] = { ...specs[i], uz: e.target.value }; setF({ specs }); }} placeholder="Nom UZ — O'lcham" className={inputCls} />
                    <input value={s.ru} onChange={(e) => { const specs = [...form.specs]; specs[i] = { ...specs[i], ru: e.target.value }; setF({ specs }); }} placeholder="Nom RU — Размер" className={inputCls} />
                    <input value={s.v} onChange={(e) => { const specs = [...form.specs]; specs[i] = { ...specs[i], v: e.target.value }; setF({ specs }); }} placeholder="900 × 400 mm" className={inputCls} />
                    <button type="button" onClick={() => setF({ specs: form.specs.filter((_, j) => j !== i) })} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-xs text-muted hover:border-rose-500/60 hover:text-rose-400">
                      <Svg d={Icon.trash} className="h-4 w-4" />
                      <span className="sm:hidden">Qatorni o&apos;chirish</span>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setF({ specs: [...form.specs, { uz: '', ru: '', v: '' }] })} className="btn-ghost mt-1 w-fit px-4 py-2 text-xs">
                  + Xususiyat qo&apos;shish
                </button>
              </div>

              {formErr && (
                <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{formErr}</p>
              )}
            </div>

            <div className="flex flex-none items-center justify-end gap-3 border-t border-line px-4 py-3.5 sm:px-6 sm:py-4">
              <button type="button" onClick={() => setForm(null)} className="btn-ghost">Bekor</button>
              <button type="submit" disabled={saving || uploading} className="btn-primary disabled:opacity-50">
                {saving ? 'Saqlanmoqda…' : form.id ? 'Saqlash' : 'Qo\'shish'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
