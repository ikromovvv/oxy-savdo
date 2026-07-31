'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './StoreProvider';
import { site } from '@/lib/site';

export default function Header() {
  const { t, lang, setLang, count, setCartOpen } = useStore();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/katalog/skins', label: t('nav_skins') },
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
          </div>
        </div>
      )}
    </header>
  );
}
