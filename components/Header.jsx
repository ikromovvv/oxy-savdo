'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from './StoreProvider';
import { LANGS } from '@/lib/i18n';
import { formatPrice } from '@/lib/products';
import { site } from '@/lib/site';
import OxyLogo from './OxyLogo';
import Select from './Select';
import TopUpModal from './TopUpModal';
import { ShoppingCart, Wallet, Plus, ChevronDown, SteamIcon, Search, Globe, Check, X } from './icons';


// "Yana" ro'yxati: kam ishlatiladigan bo'limlar shu yerga tushadi (yangi bo'lim qo'shilsa, tepadagi menyu to'lib ketmaydi)
function MoreMenu({ links, isActive, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
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

  const anyActive = links.some((l) => isActive(l.href));
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
          anyActive || open ? 'bg-white/[0.07] text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
        }`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-ink/95 py-1 shadow-[0_16px_44px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              className={`block px-4 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white ${isActive(l.href) ? 'text-white' : 'text-white/75'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
          open ? 'border-accent/60 shadow-[0_0_16px_rgba(255,255,255,0.25)]' : 'border-line hover:border-white/40'
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
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? 'rotate-180 text-accent' : ''}`} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-ink/95 py-1 shadow-[0_16px_44px_rgba(0,0,0,0.6),0_0_22px_rgba(255,255,255,0.1)] backdrop-blur-xl"
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
            <Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
          </button>
          <a href="/api/auth/steam/logout" className={`${item} border-t border-line text-muted`}>
            {t('steam_logout')}
          </a>
        </div>
      )}
    </div>
  );
}

// Header qidiruvi: /skinlar sahifasida yozganda katalog darhol filtrlanadi; boshqa sahifada Enter bosilganda katalogga o'tadi.
function HeaderSearch({ placeholder, className = '', onDone }) {
  const router = useRouter();
  const pathname = usePathname();
  const [v, setV] = useState('');
  const timer = useRef(null);
  // shu sahifalarda yozganda ro'yxat o'sha zahoti filtrlanadi; qolgan sahifalarda Enter bosilsa katalogga o'tadi
  const onCatalog = ['/', '/skinlar', '/telegram-skinlar', '/sotish'].includes(pathname);

  useEffect(() => {
    setV(onCatalog ? new URLSearchParams(window.location.search).get('q') || '' : '');
  }, [pathname, onCatalog]);

  // katalogdagi "Filtrlarni tozalash" qidiruvni ham tozalaydi
  useEffect(() => {
    const h = (e) => setV(String(e.detail ?? ''));
    window.addEventListener('oxy:search', h);
    return () => window.removeEventListener('oxy:search', h);
  }, []);

  const apply = (value, push) => {
    const base = onCatalog ? pathname : '/skinlar';
    const url = value ? `${base}?q=${encodeURIComponent(value)}` : base;
    if (onCatalog) {
      window.history.replaceState(null, '', url);
      window.dispatchEvent(new CustomEvent('oxy:search', { detail: value }));
    } else if (push) {
      router.push(url);
    }
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        apply(v.trim(), true);
        onDone?.();
      }}
      className={`relative ${className}`}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      <input
        value={v}
        onChange={(e) => {
          const val = e.target.value;
          setV(val);
          clearTimeout(timer.current);
          if (onCatalog) timer.current = setTimeout(() => apply(val.trim(), false), 250);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-line bg-panel/70 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-white/40"
      />
    </form>
  );
}

// Til menyusi: globus ikonkasi + to'liq nomlar, tanlangani belgilanadi
function LangMenu({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const langs = LANGS.map((l) => [l.code, l.name]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${open ? 'border-white/40 bg-white/5 text-white' : 'border-line text-white/80 hover:border-white/30 hover:text-white'}`}
      >
        <Globe className="h-4 w-4" strokeWidth={1.8} />
        {lang.toUpperCase()}
        <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-panel/95 py-1 shadow-[0_16px_44px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {langs.map(([code, name]) => (
            <button
              key={code}
              role="option"
              aria-selected={lang === code}
              onClick={() => {
                setLang(code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${lang === code ? 'text-white' : 'text-white/70'}`}
            >
              {name}
              {lang === code && <Check className="h-4 w-4 text-accent" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { t, lang, setLang, count, setCartOpen, user, userLoading, favoritesCount, balance, wallet } = useStore();
  const [open, setOpen] = useState(false);
  const [topUp, setTopUp] = useState(false);
  const pathname = usePathname();

  // sahifa almashsa menyu yopiladi
  useEffect(() => setOpen(false), [pathname]);

  // menyu ochiq bo'lsa orqa fon scroll qilmasin
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
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
    { href: '/skinlar', label: t('nav_skins') },
    { href: '/balans', label: t('nav_balance') },
    { href: '/telegram-skinlar', label: t('nav_tg') },
    { href: '/sotish', label: t('nav_sell') },
  ];
  // yangi bo'lim qo'shilsa shu ro'yxatga qo'shiladi
  const moreLinks = [
    { href: '/pul-ishlash', label: t('nav_earn') },
    { href: '/katalog/kovriklar', label: t('nav_pads') },
    { href: '/katalog/aksessuar', label: t('nav_acc') },
    { href: '/parvarish', label: t('nav_care') },
    { href: '/yordam', label: t('nav_support') },
  ];
  const drawerLinks = [
    { href: '/skinlar', label: t('nav_skins') },
    { href: '/balans', label: t('nav_balance') },
    { href: '/telegram-skinlar', label: t('nav_tg') },
    { href: '/sotish', label: t('nav_sell') },
    { href: '/pul-ishlash', label: t('nav_earn') },
    { href: '/katalog/kovriklar', label: t('nav_pads') },
    { href: '/katalog/aksessuar', label: t('nav_acc') },
    ...(user ? [{ href: '/buyurtmalarim', label: t('nav_orders') }] : []),
    { href: '/parvarish', label: t('nav_care') },
    { href: '/yordam', label: t('nav_support') },
  ];

  const isActive = (href) => (href === '/' || (href === '/skinlar' && pathname === '/') ? pathname === '/' : pathname?.startsWith(href));
  const loggedIn = !userLoading && user;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
        <div className="container-wide flex h-14 items-center justify-between gap-3">
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
              <MoreMenu links={moreLinks} isActive={isActive} label={t('nav_more')} />
            </nav>
          </div>

          <HeaderSearch placeholder={t('catalog_search_ph')} className="mx-2 hidden max-w-md flex-1 lg:block" />

          <div className="flex flex-none items-center gap-2">
            <div className="hidden sm:block">
              <LangMenu lang={lang} setLang={setLang} />
            </div>

            <button
              onClick={() => setCartOpen(true)}
              aria-label={t('cart')}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-accent text-ink transition hover:brightness-95 hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]"
            >
              <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2} />
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
                  <Wallet className="h-4 w-4 flex-none text-accent" strokeWidth={2} />
                  <span className="mx-2 hidden whitespace-nowrap text-sm font-semibold min-[420px]:inline">
                    {balance == null ? '…' : formatPrice(balance)}
                    {wallet?.demo > 0 && (
                      <span className="ml-1.5 rounded bg-amber-500/20 px-1 py-0.5 align-middle text-[9px] font-bold uppercase text-amber-300" title="Demo pul: haqiqiy emas">
                        demo
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setTopUp(true)}
                    aria-label={t('balance_topup')}
                    className="ml-1.5 grid h-8 w-8 place-items-center rounded-lg bg-accent text-ink transition hover:brightness-95 hover:shadow-[0_0_14px_rgba(255,255,255,0.4)] min-[420px]:ml-0"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </div>
                <ProfileMenu onTopUp={() => setTopUp(true)} />
              </>
            ) : (
              !userLoading && (
                <a
                  href="/api/auth/steam/login"
                  className="hidden h-10 items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/[0.06] px-3.5 text-xs font-semibold text-white transition hover:border-accent/70 hover:shadow-[0_0_16px_rgba(255,255,255,0.25)] sm:flex"
                >
                  <SteamIcon className="h-3.5 w-3.5" />
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
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-4">
            {loggedIn && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-accent" strokeWidth={2} />
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

            <HeaderSearch placeholder={t('catalog_search_ph')} className="mb-2 px-1" onDone={() => setOpen(false)} />

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

            <div className="mt-3 flex flex-wrap gap-2 px-3">
              {LANGS.map((x) => x.code).map((l) => (
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
                  <SteamIcon className="h-4 w-4" />
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
