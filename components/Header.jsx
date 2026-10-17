'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from './StoreProvider';
import { formatPrice } from '@/lib/products';
import { site } from '@/lib/site';
import OxyLogo from './OxyLogo';
import Select from './Select';
import TopUpModal from './TopUpModal';

const STEAM_ICON =
  'M12 2C6.95 2 2.8 5.8 2.14 10.7l4.5 1.86a2.7 2.7 0 0 1 1.53-.47c.06 0 .12 0 .18.01l2-2.9v-.04a3.6 3.6 0 0 1 3.6-3.6 3.6 3.6 0 0 1 0 7.2h-.08l-2.86 2.04c0 .06.01.11.01.17a2.72 2.72 0 0 1-5.4.5L2 15.06C2.9 19.14 6.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm-2.02 15.34-1.03-.43a2.06 2.06 0 0 0 1.9 1.27 2.07 2.07 0 0 0 2.07-2.07 2.06 2.06 0 0 0-.86-1.68l1.06.44a1.52 1.52 0 1 1-1.17 2.8l-1.97-.33Zm7.65-8.32a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Zm-2.4 1.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z';

function Ico({ d, className = 'h-4 w-4', fill = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${fill ? 'fill-current' : 'fill-none stroke-current stroke-2'}`} aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const WALLET = 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm14 6h.01';
const CART = 'M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 6H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z';
const PLUS = 'M12 5v14M5 12h14';

// Foydalanuvchi menyusi (avatar + dropdown): buyurtmalar, saqlangan, balans, chiqish
function ProfileMenu({ onTopUp }) {
  const { t, user, favoritesCount } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-white/85 transition-colors hover:bg-white/5 hover:text-white';

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-10 items-center gap-1.5 rounded-xl border bg-panel pl-1.5 pr-2.5 transition-all ${
          open ? 'border-accent/60 shadow-[0_0_16px_rgba(198,255,0,0.25)]' : 'border-line hover:border-white/40'
        }`}
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-lg" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-xs font-semibold">
            {user.name?.[0]?.toUpperCase() || 'S'}
          </span>
        )}
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 fill-none stroke-current stroke-2 text-muted transition-transform ${open ? 'rotate-180 text-accent' : ''}`}>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-ink/95 py-1 shadow-[0_16px_44px_rgba(0,0,0,0.6),0_0_22px_rgba(198,255,0,0.1)] backdrop-blur-xl"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="text-[11px] text-muted">Steam</div>
          </div>
          <Link href="/buyurtmalarim" onClick={() => setOpen(false)} className={item}>
            {t('nav_orders')}
          </Link>
          <Link href="/saqlangan" onClick={() => setOpen(false)} className={item}>
            {t('saved_title')}
            {favoritesCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
                {favoritesCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onTopUp();
            }}
            className={item}
          >
            {t('balance_topup')}
            <Ico d={PLUS} className="h-3.5 w-3.5 text-accent" />
          </button>
          <a href="/api/auth/steam/logout" className={`${item} border-t border-line text-muted`}>
            {t('steam_logout')}
          </a>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { t, lang, setLang, count, setCartOpen, user, userLoading, favoritesCount, balance } = useStore();
  const [open, setOpen] = useState(false);
  const [topUp, setTopUp] = useState(false);
  const pathname = usePathname();

  // sahifa almashsa menyu yopiladi
  useEffect(() => setOpen(false), [pathname]);

  // menyu ochiq bo'lsa orqa fon scroll qilmasin
  useEffect(() => {
    const lenis = typeof window !== 'undefined' ? window.__lenis : null;
    if (open) {
      document.body.style.overflow = 'hidden';
      lenis?.stop();
    } else {
      document.body.style.overflow = '';
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = '';
      lenis?.start();
    };
  }, [open]);

  // Savatdan "Balansni to'ldirish" bosilganda modal shu yerda ochiladi
  useEffect(() => {
    const h = () => {
      setCartOpen(false);
      setTopUp(true);
    };
    window.addEventListener('oxy:topup', h);
    return () => window.removeEventListener('oxy:topup', h);
  }, [setCartOpen]);

  // Admin panelning o'z sharhi bor — sayt header'i ko'rsatilmaydi
  if (pathname?.startsWith('/admin')) return null;

  // ixcham asosiy navigatsiya; qolganlari mobil menyu va footer'da
  const mainLinks = [
    { href: '/', label: t('nav_skins') },
    { href: '/sotish', label: t('nav_sell') },
    { href: '/katalog/kovriklar', label: t('nav_pads') },
    { href: '/yordam', label: t('nav_support') },
  ];
  const drawerLinks = [
    { href: '/', label: t('nav_skins') },
    { href: '/sotish', label: t('nav_sell') },
    { href: '/katalog/kovriklar', label: t('nav_pads') },
    { href: '/katalog/aksessuar', label: t('nav_acc') },
    ...(user ? [{ href: '/buyurtmalarim', label: t('nav_orders') }] : []),
    { href: '/parvarish', label: t('nav_care') },
    { href: '/yordam', label: t('nav_support') },
  ];

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));
  const loggedIn = !userLoading && user;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
        <div className="container-site flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="flex flex-none items-center py-2" aria-label={site.name}>
              <OxyLogo size={22} />
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {mainLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive(l.href) ? 'bg-white/[0.07] text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-none items-center gap-2">
            <div className="hidden sm:block">
              <Select
                compact
                align="right"
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'uz', label: 'UZ' },
                  { value: 'ru', label: 'RU' },
                ]}
              />
            </div>

            <button
              onClick={() => setCartOpen(true)}
              aria-label={t('cart')}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-accent text-ink transition hover:brightness-95 hover:shadow-[0_0_18px_rgba(198,255,0,0.35)]"
            >
              <Ico d={CART} className="h-[18px] w-[18px]" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-ink">
                  {count}
                </span>
              )}
            </button>

            {loggedIn ? (
              <>
                {/* balans + to'ldirish */}
                <div className="flex h-10 items-center rounded-xl border border-line bg-panel pl-2.5 pr-1">
                  <Ico d={WALLET} className="h-4 w-4 flex-none text-accent" />
                  <span className="mx-2 hidden whitespace-nowrap text-sm font-semibold min-[420px]:inline">
                    {balance == null ? '…' : formatPrice(balance)}
                  </span>
                  <button
                    onClick={() => setTopUp(true)}
                    aria-label={t('balance_topup')}
                    className="ml-1.5 grid h-8 w-8 place-items-center rounded-lg bg-accent text-ink transition hover:brightness-95 hover:shadow-[0_0_14px_rgba(198,255,0,0.4)] min-[420px]:ml-0"
                  >
                    <Ico d={PLUS} className="h-4 w-4" />
                  </button>
                </div>
                <ProfileMenu onTopUp={() => setTopUp(true)} />
              </>
            ) : (
              !userLoading && (
                <a
                  href="/api/auth/steam/login"
                  className="hidden h-10 items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/[0.06] px-3.5 text-xs font-semibold text-white transition hover:border-accent/70 hover:shadow-[0_0_16px_rgba(198,255,0,0.25)] sm:flex"
                >
                  <Ico d={STEAM_ICON} className="h-3.5 w-3.5" fill />
                  <span className="whitespace-nowrap md:hidden lg:inline">{t('steam_login')}</span>
                </a>
              )
            )}

            <button
              onClick={() => setOpen(true)}
              aria-label="Menyu"
              className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-xl border border-line md:hidden"
            >
              <span className="block h-[2px] w-4 bg-white" />
              <span className="block h-[2px] w-4 bg-white" />
            </button>
          </div>
        </div>
      </header>

      <TopUpModal open={topUp} onClose={() => setTopUp(false)} />

      {/* ——— mobil menyu: o'ngdan sirg'alib chiqadigan drawer ——— */}
      <div className={`fixed inset-0 z-[60] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-[80%] max-w-xs flex-col border-l border-line bg-ink transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-16 flex-none items-center justify-between border-b border-line px-5">
            <OxyLogo size={20} />
            <button
              onClick={() => setOpen(false)}
              aria-label="Yopish"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:text-white"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-4">
            {loggedIn && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Ico d={WALLET} className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold">{balance == null ? '…' : formatPrice(balance)}</span>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    setTopUp(true);
                  }}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-ink"
                >
                  {t('balance_topup')}
                </button>
              </div>
            )}

            {drawerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] text-white/85 transition hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/saqlangan"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] text-white/85 transition hover:bg-white/5 hover:text-white"
            >
              {t('saved_title')}
              {favoritesCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <div className="mt-3 flex gap-2 px-3">
              {['uz', 'ru'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full border border-line px-4 py-2 text-xs uppercase transition ${
                    lang === l ? 'bg-white text-ink' : 'text-muted'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </nav>

          {!userLoading && (
            <div className="flex-none border-t border-line p-4">
              {user ? (
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                      {user.name?.[0]?.toUpperCase() || 'S'}
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm text-white/85">{user.name}</span>
                  <a href="/api/auth/steam/logout" className="py-2 pl-2 text-xs text-muted">
                    {t('steam_logout')}
                  </a>
                </div>
              ) : (
                <a
                  href="/api/auth/steam/login"
                  className="flex items-center justify-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.06] py-3 text-sm font-semibold text-white"
                >
                  <Ico d={STEAM_ICON} className="h-4 w-4" fill />
                  {t('steam_login')}
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
