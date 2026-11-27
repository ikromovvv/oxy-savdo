'use client';

import { useEffect, useState } from 'react';
import { Icon, Svg, inputCls } from '@/components/admin/ui';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminFailed from '@/components/admin/AdminFailed';
import AdminCs2shop from '@/components/admin/AdminCs2shop';
import AdminLis from '@/components/admin/AdminLis';
import AdminStats from '@/components/admin/AdminStats';
import { ToastHost } from '@/components/admin/Toast';

const NAV = [
  { key: 'dashboard', label: 'Panel', icon: Icon.grid },
  { key: 'products', label: 'Mahsulotlar', icon: Icon.box },
  { key: 'cs2shop', label: 'cs2shop', icon: Icon.wallet, provider: 'cs2shop' },
  { key: 'lis', label: 'LIS-SKINS', icon: Icon.wallet, provider: 'lis' },
];

// Statistika bo'limlari (har biri alohida sahifa). Faqat-statistika akkaunti faqat shularni ko'radi.
const STAT_NAV = [
  { key: 'stat_overview', label: 'Statistika', icon: Icon.grid, stat: true },
  { key: 'stat_tg', label: 'Telegram skinlar', icon: Icon.box, stat: true },
  { key: 'stat_sales', label: 'Sayt savdosi', icon: Icon.cart, stat: true },
  { key: 'stat_traffic', label: 'Tashrifchilar', icon: Icon.star, stat: true },
  { key: 'stat_users', label: 'Foydalanuvchilar', icon: Icon.wallet, stat: true },
];

function Sidebar({ view, setView, onLogout, onNav, nav = NAV, adminName }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-ink">O</span>
        <span className="text-xs font-semibold tracking-[0.28em] text-muted">OXY / ADMIN</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => { setView(n.key); onNav?.(); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              view === n.key ? 'bg-white text-ink' : 'text-white/75 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Svg d={n.icon} className="h-4 w-4" />
            {n.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        {adminName && <div className="px-3 pb-2 text-[11px] uppercase tracking-wider text-muted">Admin: <span className="text-white/80">{adminName}</span></div>}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <Svg d={Icon.logout} className="h-4 w-4" />
          Chiqish
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [provider, setProvider] = useState('');
  const [adminName, setAdminName] = useState('');
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');

  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState('dashboard');
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        setAuthed(Boolean(d.admin));
        setProvider(d.provider || '');
        setAdminName(d.name || '');
        setRole(d.role || 'admin');
        if (d.role === 'stats') setView('stat_overview');
        setConfigured(d.configured !== false);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function doLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginErr('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, username }),
      });
      const d = await r.json();
      if (d.ok) {
        setAdminName(d.name || '');
        // provider (LIS menyusi) kirgandan keyin darhol chiqishi uchun
        await fetch('/api/admin/me', { cache: 'no-store' })
          .then((x) => x.json())
          .then((m) => {
            setProvider(m.provider || '');
            setRole(m.role || 'admin');
            setView(m.role === 'stats' ? 'stat_overview' : 'dashboard');
          })
          .catch(() => {});
        setAuthed(true);
        setPassword('');
        setUsername('');
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
    setDrawer(false);
  }

  // ——— checking ———
  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  // ——— login ———
  if (!authed) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-ink px-4">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[90px]" />
        <form onSubmit={doLogin} className="card relative w-full max-w-sm p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-bold text-ink">O</span>
            <span className="text-xs font-semibold tracking-[0.3em] text-muted">OXY / ADMIN</span>
          </div>

          <h1 className="mt-6 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-line text-accent">
              <Svg d={Icon.lock} className="h-4 w-4" />
            </span>
            Kirish
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Boshqaruv paneliga kirish uchun login va parolni kiriting.</p>

          {!configured && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
              <code>ADMIN_PASSWORD</code> sozlanmagan.
            </p>
          )}

          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Login" autoComplete="username" className={`${inputCls} mt-6`} />

          <div className="relative mt-3">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoFocus autoComplete="current-password" className={`${inputCls} pr-20`} />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Parolni yashirish' : "Parolni ko'rsatish"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-white/10 hover:text-white"
            >
              {showPw ? 'Yashirish' : "Ko'rsatish"}
            </button>
          </div>
          {loginErr && <p className="mt-2 text-xs text-rose-400">{loginErr}</p>}

          <button type="submit" disabled={loggingIn || !password} className="btn-primary mt-5 w-full disabled:opacity-50">
            {loggingIn ? 'Tekshirilmoqda…' : 'Kirish'}
          </button>
        </form>
      </div>
    );
  }

  // Yetkazib beruvchi bo'limi faqat faol provayderga (FULFILL_PROVIDER) ko'rinadi
  const nav = role === 'stats' ? STAT_NAV : [...NAV.filter((n) => !n.provider || n.provider === provider), ...STAT_NAV];
  const active = nav.find((n) => n.key === view);

  // ——— shell ———
  return (
    <div className={`min-h-screen bg-ink text-white ${view === 'cs2shop' || view === 'lis' ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-panel/50 md:block">
        <Sidebar view={view} setView={setView} onLogout={doLogout} nav={nav} adminName={adminName} />
      </aside>

      {/* mobile drawer — chapdan sirg'alib chiqadi */}
      <div className={`fixed inset-0 z-50 md:hidden ${drawer ? '' : 'pointer-events-none'}`} aria-hidden={!drawer}>
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            drawer ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 border-r border-line bg-panel transition-transform duration-300 ease-out ${
            drawer ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar view={view} setView={setView} onLogout={doLogout} onNav={() => setDrawer(false)} nav={nav} adminName={adminName} />
        </aside>
      </div>

      <div className={`flex min-h-screen flex-col md:pl-60 ${view === 'cs2shop' || view === 'lis' ? 'lg:h-screen lg:min-h-0' : ''}`}>
        <header className="sticky top-0 z-30 flex h-14 flex-none items-center gap-3 border-b border-line bg-ink/85 px-4 backdrop-blur-xl md:px-8">
          <button onClick={() => setDrawer(true)} aria-label="Menyu" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-white/80 md:hidden">
            <Svg d={Icon.menu} className="h-4 w-4" />
          </button>
          <h1 className="text-base font-bold tracking-tight">{active?.label}</h1>
        </header>

        <main className={`flex-1 p-4 md:p-8 ${view === 'cs2shop' || view === 'lis' ? 'admin-scroll lg:min-h-0 lg:overflow-y-auto' : ''}`}>
          <div className={`mx-auto ${view === 'cs2shop' || view === 'lis' ? 'max-w-none lg:h-full' : 'max-w-5xl'}`}>
            {view === 'dashboard' && <AdminDashboard onGo={setView} provider={provider} />}
            {view === 'products' && <AdminProducts onToast={flash} />}
            {view === 'orders' && <AdminOrders />}
            {view === 'failed' && <AdminFailed onOpenOrders={() => setView('orders')} />}
            {view === 'cs2shop' && <AdminCs2shop />}
            {view === 'lis' && <AdminLis />}
            {view.startsWith('stat_') && <AdminStats view={view} onGo={setView} />}
          </div>
        </main>
      </div>

      <ToastHost />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_30px_rgba(255,255,255,0.3)]">
          <Svg d={Icon.check} className="h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  );
}
