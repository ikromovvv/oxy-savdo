'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/products';
import AdminOrders from '@/components/AdminOrders';

// ⚠️ Bu sahifa Header navigatsiyasida ko'rsatilmaydi — to'g'ridan-to'g'ri /admin
// manzili orqali ochiladi va parol bilan himoyalangan.

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

const inputCls =
  'w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/25';
const labelCls = 'label mb-1.5 block';

function emptyForm(category = 'kovriklar') {
  return {
    id: null,
    name: '',
    category,
    price: '',
    tone: 'from-white/10 to-black',
    image: '',
    imagesText: '',
    shortUz: '',
    shortRu: '',
    badgeUz: '',
    badgeRu: '',
    featured: false,
    specs: [],
  };
}

function toForm(p) {
  return {
    id: p.id,
    name: p.name || '',
    category: p.category || 'kovriklar',
    price: String(p.price ?? ''),
    tone: p.tone || 'from-white/10 to-black',
    image: p.image || (p.images && p.images[0]) || '',
    imagesText: (p.images || []).join('\n'),
    shortUz: p.short?.uz || '',
    shortRu: p.short?.ru || '',
    badgeUz: p.badge?.uz || '',
    badgeRu: p.badge?.ru || '',
    featured: Boolean(p.featured),
    specs: (p.specs || []).map((s) => ({ uz: s.uz || '', ru: s.ru || '', v: s.v || '' })),
  };
}

function fromForm(f) {
  const images = f.imagesText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (f.image && !images.includes(f.image.trim())) images.unshift(f.image.trim());
  return {
    id: f.id || undefined,
    name: f.name,
    category: f.category,
    price: f.price,
    tone: f.tone,
    image: images[0] || '',
    images,
    short: { uz: f.shortUz, ru: f.shortRu || f.shortUz },
    badge:
      f.badgeUz || f.badgeRu ? { uz: f.badgeUz, ru: f.badgeRu || f.badgeUz } : null,
    featured: f.featured,
    specs: f.specs
      .map((s) => ({ uz: s.uz.trim(), ru: (s.ru || s.uz).trim(), v: s.v.trim() }))
      .filter((s) => s.uz || s.v),
  };
}

// ————— kichik ikonalar —————
const Icon = {
  lock: (
    <path
      d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />,
  edit: (
    <path
      d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14 7l3 3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <path
      d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  check: <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  star: (
    <path
      d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 22l-5.2-2.9 1-5.8L3.5 9.2l5.9-.9L12 3Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  logout: (
    <path
      d="M15 12H4m0 0 4-4m-4 4 4 4m2-12h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  close: <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />,
  image: (
    <path
      d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 12 4.5-5 3 3L15 9l4 5M8.5 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

function Svg({ d, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[1.7]`}>
      {d}
    </svg>
  );
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [configured, setConfigured] = useState(true);

  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState('products'); // products | orders
  const [tab, setTab] = useState('kovriklar');
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState('');

  const [form, setForm] = useState(null); // null = forma yopiq
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const mainFileRef = useRef(null);
  const galleryFileRef = useRef(null);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // --- auth tekshirish ---
  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        setAuthed(Boolean(d.admin));
        setConfigured(d.configured !== false);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListErr('');
    try {
      const r = await fetch(`/api/products?category=${tab}`, { cache: 'no-store' });
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setListErr('Ro\'yxatni yuklab bo\'lmadi');
    } finally {
      setListLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (authed) loadList();
  }, [authed, loadList]);

  // modal ochiq bo'lsa fon scroll qilmasin
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = form ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [form]);

  async function doLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginErr('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await r.json();
      if (d.ok) {
        setAuthed(true);
        setPassword('');
      } else {
        setLoginErr(d.error || 'Kirib bo\'lmadi');
      }
    } catch {
      setLoginErr('Server bilan bog\'lanib bo\'lmadi');
    } finally {
      setLoggingIn(false);
    }
  }

  async function doLogout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setAuthed(false);
    setItems([]);
    setForm(null);
  }

  function openCreate() {
    setFormErr('');
    setForm(emptyForm(tab));
  }
  function openEdit(p) {
    setFormErr('');
    setForm(toForm(p));
  }

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
      flash(isEdit ? 'Saqlandi' : 'Qo\'shildi');
      if (payload.category !== tab) setTab(payload.category);
      else loadList();
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
      flash('O\'chirildi');
      loadList();
    } catch (e) {
      flash(e.message);
    }
  }

  const count = items.length;
  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));

  // ————————————————————————— RENDER —————————————————————————

  if (checking) {
    return (
      <section className="container-site py-24">
        <div className="mx-auto h-44 max-w-sm animate-pulse rounded-2xl bg-white/5" />
      </section>
    );
  }

  if (!authed) {
    return (
      <section className="container-site relative flex min-h-[80vh] items-center justify-center py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[90px]"
        />
        <form onSubmit={doLogin} className="card relative w-full max-w-sm p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-bold text-ink">
              O
            </span>
            <span className="text-xs font-semibold tracking-[0.3em] text-muted">OXY / ADMIN</span>
          </div>

          <h1 className="mt-6 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-line text-accent">
              <Svg d={Icon.lock} className="h-4 w-4" />
            </span>
            Kirish
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kovrik va aksessuarlarni boshqarish uchun parolni kiriting.
          </p>

          {!configured && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
              <code>ADMIN_PASSWORD</code> hali sozlanmagan. <code>.env.local</code> ga
              qo&apos;shing va serverni qayta ishga tushiring.
            </p>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            className={`${inputCls} mt-6`}
          />
          {loginErr && <p className="mt-2 text-xs text-rose-400">{loginErr}</p>}

          <button
            type="submit"
            disabled={loggingIn || !password}
            className="btn-primary mt-5 w-full disabled:opacity-50"
          >
            {loggingIn ? 'Tekshirilmoqda…' : 'Kirish'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <>
      {/* ——— yopishqoq admin panel bari ——— */}
      <div className="sticky top-16 z-30 border-b border-line bg-ink/85 backdrop-blur-xl">
        <div className="container-site flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-1 rounded-full border border-line p-0.5">
            <button
              onClick={() => setView('products')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                view === 'products' ? 'bg-white text-ink' : 'text-muted hover:text-white'
              }`}
            >
              Mahsulotlar
              {view === 'products' && (
                <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 text-[10px]">{count}</span>
              )}
            </button>
            <button
              onClick={() => setView('orders')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                view === 'orders' ? 'bg-white text-ink' : 'text-muted hover:text-white'
              }`}
            >
              Buyurtmalar
            </button>
          </div>
          <div className="flex flex-none items-center gap-2">
            {view === 'products' && (
              <button
                onClick={openCreate}
                className="btn-primary px-3.5 py-2 text-xs sm:px-5 sm:text-sm"
              >
                <Svg d={Icon.plus} className="h-4 w-4" />
                <span className="sm:hidden">Yangi</span>
                <span className="hidden sm:inline">Yangi mahsulot</span>
              </button>
            )}
            <button
              onClick={doLogout}
              title="Chiqish"
              className="btn-ghost px-3 py-2 text-xs sm:text-sm"
            >
              <Svg d={Icon.logout} className="h-4 w-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </div>

      <section className="container-site py-6 sm:py-8">
        {view === 'orders' ? (
          <AdminOrders />
        ) : (
        <>
        <p className="text-sm text-muted">
          Kovrik va aksessuarlarni qo&apos;shish, tahrirlash va o&apos;chirish.
        </p>

        {/* ——— kategoriya tablari ——— */}
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => {
                setTab(c.slug);
                setConfirmId(null);
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                tab === c.slug
                  ? 'border-white bg-white text-ink'
                  : 'border-line text-white/80 hover:border-white/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* ——— ro'yxat ——— */}
        <div className="mt-5 flex flex-col gap-3">
          {listLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-[104px] animate-pulse bg-white/5" />
            ))
          ) : listErr ? (
            <div className="card p-6 text-center text-sm text-rose-400">{listErr}</div>
          ) : items.length === 0 ? (
            <div className="card grid place-items-center gap-3 p-10 text-center sm:p-12">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line text-muted">
                <Svg d={Icon.plus} className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted">
                Bu bo&apos;limda hali mahsulot yo&apos;q.
              </p>
              <button onClick={openCreate} className="btn-ghost mt-1">
                Yangi qo&apos;shish
              </button>
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="card card-hover flex min-w-0 items-stretch gap-3 overflow-hidden p-2.5 sm:gap-4 sm:p-3"
              >
                <div
                  className={`aspect-[5/3] w-[88px] flex-none self-center overflow-hidden rounded-lg bg-gradient-to-br sm:w-32 ${
                    p.tone || 'from-white/10 to-black'
                  }`}
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center px-1 text-center text-[9px] font-medium leading-tight text-white/60">
                      {p.name}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 truncate text-sm font-semibold sm:text-[15px]">
                      {p.name}
                    </span>
                    {p.featured && (
                      <span className="inline-flex flex-none items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-ink">
                        <Svg d={Icon.star} className="h-2.5 w-2.5" />
                        TOP
                      </span>
                    )}
                    {p.badge?.uz && (
                      <span className="flex-none rounded-full border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted">
                        {p.badge.uz}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 line-clamp-1 text-xs text-muted">
                    {p.short?.uz || '—'}
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <span className="text-sm font-semibold">{formatPrice(p.price || 0)}</span>

                    <div className="flex flex-none items-center gap-1.5">
                      {confirmId === p.id ? (
                        <>
                          <button
                            onClick={() => doDelete(p.id)}
                            className="rounded-full bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
                          >
                            O&apos;chir
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            aria-label="Bekor"
                            className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:text-white"
                          >
                            <Svg d={Icon.close} className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-xs text-white/85 transition hover:border-white/40"
                          >
                            <Svg d={Icon.edit} className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Tahrirlash</span>
                          </button>
                          <button
                            onClick={() => setConfirmId(p.id)}
                            aria-label="O'chirish"
                            className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:border-rose-500/60 hover:text-rose-400"
                          >
                            <Svg d={Icon.trash} className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </section>

      {/* ——— forma modal (mobil: to'liq ekran sheet) ——— */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-black/75 backdrop-blur-md sm:items-start sm:p-6 md:p-8"
          onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}
        >
          <form
            onSubmit={saveForm}
            className="card flex w-full max-w-2xl flex-col overflow-hidden rounded-none border-x-0 sm:my-2 sm:rounded-2xl sm:border-x"
          >
            {/* header */}
            <div className="flex flex-none items-center justify-between border-b border-line px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <span className="label">
                  {form.category === 'kovriklar' ? 'Kovrik' : 'Aksessuar'}
                </span>
                <h2 className="mt-0.5 truncate text-base font-bold tracking-tight sm:text-lg">
                  {form.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Yopish"
                className="grid h-8 w-8 flex-none place-items-center rounded-full border border-line text-muted transition hover:text-white"
              >
                <Svg d={Icon.close} className="h-4 w-4" />
              </button>
            </div>

            {/* body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[68vh] sm:flex-none sm:px-6 sm:py-5">
              {/* ASOSIY */}
              <div className="label border-b border-line pb-2">Asosiy</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nomi *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setF({ name: e.target.value })}
                    placeholder="OXY Darkness XL"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Kategoriya *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setF({ category: e.target.value })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Narx (so&apos;m) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.price}
                    onChange={(e) => setF({ price: e.target.value })}
                    placeholder="420000"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Qisqa tavsif (UZ)</label>
                  <textarea
                    value={form.shortUz}
                    onChange={(e) => setF({ shortUz: e.target.value })}
                    rows={2}
                    placeholder="Aniqlik va barqarorlikni qadrlaydiganlar uchun…"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Qisqa tavsif (RU)</label>
                  <textarea
                    value={form.shortRu}
                    onChange={(e) => setF({ shortRu: e.target.value })}
                    rows={2}
                    placeholder="Bo'sh qoldirilsa — UZ matni ishlatiladi"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* RASMLAR */}
              <div className="label mt-8 border-b border-line pb-2">Rasmlar</div>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className={labelCls}>Asosiy rasm (URL)</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={form.image}
                      onChange={(e) => setF({ image: e.target.value })}
                      placeholder="https://… yoki /products/nom.jpg"
                      className={`${inputCls} min-w-[160px] flex-1`}
                    />
                    <label className="btn-ghost cursor-pointer whitespace-nowrap px-4 py-2.5 text-xs">
                      {uploading ? 'Yuklanmoqda…' : 'Fayl'}
                      <input
                        ref={mainFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadFiles(e.target.files, 'main')}
                      />
                    </label>
                  </div>
                  <div
                    className={`mt-3 grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-xl border border-line bg-gradient-to-br ${form.tone}`}
                  >
                    {form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.image} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <Svg d={Icon.image} className="h-4 w-4" />
                        Rasm ko&apos;rinishi
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Galereya rasmlari (har qatorda bitta URL)</label>
                  <textarea
                    value={form.imagesText}
                    onChange={(e) => setF({ imagesText: e.target.value })}
                    rows={3}
                    placeholder={'/products/nom-1.jpg\n/products/nom-2.jpg'}
                    className={`${inputCls} font-mono text-xs`}
                  />
                  <label className="btn-ghost mt-2 inline-flex cursor-pointer px-4 py-2 text-xs">
                    {uploading ? 'Yuklanmoqda…' : '+ Rasm(lar) yuklash'}
                    <input
                      ref={galleryFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => uploadFiles(e.target.files, 'gallery')}
                    />
                  </label>
                </div>
              </div>

              {/* KO'RINISH */}
              <div className="label mt-8 border-b border-line pb-2">Ko&apos;rinish</div>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className={labelCls}>Fon rangi (rasm bo&apos;lmaganda)</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((tn) => (
                      <button
                        type="button"
                        key={tn.v}
                        onClick={() => setF({ tone: tn.v })}
                        title={tn.label}
                        className={`relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br transition ${tn.v} ${
                          form.tone === tn.v
                            ? 'ring-2 ring-accent'
                            : 'ring-1 ring-line hover:ring-white/30'
                        }`}
                      >
                        {form.tone === tn.v && (
                          <Svg d={Icon.check} className="h-4 w-4 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Nishon / Badge (UZ)</label>
                    <input
                      value={form.badgeUz}
                      onChange={(e) => setF({ badgeUz: e.target.value })}
                      placeholder="Bestseller"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nishon / Badge (RU)</label>
                    <input
                      value={form.badgeRu}
                      onChange={(e) => setF({ badgeRu: e.target.value })}
                      placeholder="Бестселлер"
                      className={inputCls}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ink px-3 py-3 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setF({ featured: e.target.checked })}
                    className="h-4 w-4 flex-none accent-accent"
                  />
                  Bosh sahifada “Tanlangan mahsulot” sifatida ko&apos;rsatilsin
                </label>
              </div>

              {/* XUSUSIYATLAR */}
              <div className="label mt-8 border-b border-line pb-2">Xususiyatlar</div>
              <div className="mt-4 grid gap-2">
                {form.specs.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:border-0 sm:p-0"
                  >
                    <input
                      value={s.uz}
                      onChange={(e) => {
                        const specs = [...form.specs];
                        specs[i] = { ...specs[i], uz: e.target.value };
                        setF({ specs });
                      }}
                      placeholder="Nom UZ — O'lcham"
                      className={inputCls}
                    />
                    <input
                      value={s.ru}
                      onChange={(e) => {
                        const specs = [...form.specs];
                        specs[i] = { ...specs[i], ru: e.target.value };
                        setF({ specs });
                      }}
                      placeholder="Nom RU — Размер"
                      className={inputCls}
                    />
                    <input
                      value={s.v}
                      onChange={(e) => {
                        const specs = [...form.specs];
                        specs[i] = { ...specs[i], v: e.target.value };
                        setF({ specs });
                      }}
                      placeholder="900 × 400 mm"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setF({ specs: form.specs.filter((_, j) => j !== i) })}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-xs text-muted transition hover:border-rose-500/60 hover:text-rose-400"
                    >
                      <Svg d={Icon.trash} className="h-4 w-4" />
                      <span className="sm:hidden">Qatorni o&apos;chirish</span>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setF({ specs: [...form.specs, { uz: '', ru: '', v: '' }] })}
                  className="btn-ghost mt-1 w-fit px-4 py-2 text-xs"
                >
                  + Xususiyat qo&apos;shish
                </button>
              </div>

              {formErr && (
                <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                  {formErr}
                </p>
              )}
            </div>

            {/* footer */}
            <div className="flex flex-none items-center justify-end gap-3 border-t border-line px-4 py-3.5 sm:px-6 sm:py-4">
              <button type="button" onClick={() => setForm(null)} className="btn-ghost">
                Bekor
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Saqlanmoqda…' : form.id ? 'Saqlash' : 'Qo\'shish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ——— toast ——— */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_30px_rgba(198,255,0,0.3)]">
          <Svg d={Icon.check} className="h-4 w-4" />
          {toast}
        </div>
      )}
    </>
  );
}
