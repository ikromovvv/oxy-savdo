'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './StoreProvider';
import { site } from '@/lib/site';

export default function Header() {
  const { t, lang, setLang, count, setCartOpen, user, userLoading, favoritesCount } = useStore();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/', label: t('nav_skins') },
    { href: '/sotish', label: t('nav_sell') },
    { href: '/katalog/kovriklar', label: t('nav_pads') },
    { href: '/katalog/aksessuar', label: t('nav_acc') },
    { href: '/parvarish', label: t('nav_care') },
    { href: '/yordam', label: t('nav_support') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-ink">
            O
          </span>
          <span className="text-sm font-semibold tracking-[0.25em]">{site.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-white/70 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!userLoading && (
            <>
              {user ? (
                <div className="hidden items-center gap-2 rounded-full border border-line py-1 pl-1.5 pr-3 sm:flex">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full" />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-semibold">
                      {user.name?.[0]?.toUpperCase() || 'S'}
                    </span>
                  )}
                  <span className="max-w-[100px] truncate text-xs text-white/85">{user.name}</span>
                  <a
                    href="/api/auth/steam/logout"
                    className="text-xs text-muted transition hover:text-white"
                  >
                    {t('steam_logout')}
                  </a>
                </div>
              ) : (
                <a
                  href="/api/auth/steam/login"
                  className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-white/85 transition hover:border-white/40 sm:flex"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                    <path d="M12 2C6.95 2 2.8 5.8 2.14 10.7l4.5 1.86a2.7 2.7 0 0 1 1.53-.47c.06 0 .12 0 .18.01l2-2.9v-.04a3.6 3.6 0 0 1 3.6-3.6 3.6 3.6 0 0 1 0 7.2h-.08l-2.86 2.04c0 .06.01.11.01.17a2.72 2.72 0 0 1-5.4.5L2 15.06C2.9 19.14 6.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm-2.02 15.34-1.03-.43a2.06 2.06 0 0 0 1.9 1.27 2.07 2.07 0 0 0 2.07-2.07 2.06 2.06 0 0 0-.86-1.68l1.06.44a1.52 1.52 0 1 1-1.17 2.8l-1.97-.33Zm7.65-8.32a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Zm-2.4 1.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />
                  </svg>
                  {t('steam_login')}
                </a>
              )}
            </>
          )}

          <div className="hidden items-center rounded-full border border-line p-0.5 sm:flex">
            {['uz', 'ru'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 text-xs uppercase transition ${
                  lang === l ? 'bg-white text-ink' : 'text-muted hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <Link
            href="/saqlangan"
            aria-label={t('saved_title')}
            className="relative hidden rounded-full border border-line p-2.5 transition hover:border-white/40 sm:grid sm:place-items-center"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path
                d="M12 20.5s-7.5-4.6-9.7-9.1C.7 8 2.2 4.6 5.6 3.9c2-.4 3.9.5 5 2.1a1 1 0 0 0 .8.5.9.9 0 0 0 .8-.5c1.1-1.6 3-2.5 5-2.1 3.4.7 4.9 4.1 3.3 7.5C19.5 15.9 12 20.5 12 20.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {favoritesCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
                {favoritesCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative rounded-full border border-line px-4 py-2 text-sm transition hover:border-white/40"
          >
            {t('cart')}
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
                {count}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="menu"
            className="rounded-full border border-line p-2 md:hidden"
          >
            <span className="block h-[2px] w-4 bg-white" />
            <span className="mt-1 block h-[2px] w-4 bg-white" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line md:hidden">
          <div className="container-site flex flex-col py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-white/80"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/saqlangan"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between py-2.5 text-sm text-white/80"
            >
              {t('saved_title')}
              {favoritesCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
                  {favoritesCount}
                </span>
              )}
            </Link>
            <div className="mt-2 flex gap-2">
              {['uz', 'ru'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full border border-line px-4 py-1.5 text-xs uppercase ${
                    lang === l ? 'bg-white text-ink' : 'text-muted'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {!userLoading && (
              <div className="mt-3 border-t border-line pt-3">
                {user ? (
                  <div className="flex items-center gap-2">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full" />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                        {user.name?.[0]?.toUpperCase() || 'S'}
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm text-white/85">{user.name}</span>
                    <a href="/api/auth/steam/logout" className="text-xs text-muted">
                      {t('steam_logout')}
                    </a>
                  </div>
                ) : (
                  <a
                    href="/api/auth/steam/login"
                    className="flex items-center justify-center gap-1.5 rounded-full border border-line py-2 text-sm text-white/85"
                  >
                    {t('steam_login')}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
