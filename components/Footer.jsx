'use client';

import Link from 'next/link';
import { useStore } from './StoreProvider';
import { site } from '@/lib/site';

export default function Footer() {
  const { t } = useStore();

  return (
    <footer className="mt-24 border-t border-line bg-panel/40">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-ink">
              O
            </span>
            <span className="text-sm font-semibold tracking-[0.25em]">{site.name}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted">{t('hero_text')}</p>
        </div>

        <div>
          <div className="label">{t('footer_shop')}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link href="/katalog/skins" className="hover:text-white">{t('nav_skins')}</Link></li>
            <li><Link href="/katalog/kovriklar" className="hover:text-white">{t('nav_pads')}</Link></li>
            <li><Link href="/katalog/aksessuar" className="hover:text-white">{t('nav_acc')}</Link></li>
          </ul>
        </div>

        <div>
          <div className="label">{t('footer_info')}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link href="/parvarish" className="hover:text-white">{t('nav_care')}</Link></li>
            <li><Link href="/yordam" className="hover:text-white">{t('nav_support')}</Link></li>
            <li><Link href="/yordam#qaytarish" className="hover:text-white">{t('returns')}</Link></li>
            <li><Link href="/yordam#oferta" className="hover:text-white">{t('offer')}</Link></li>
          </ul>
        </div>

        <div>
          <div className="label">{t('footer_contact')}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><a href={site.telegram} className="hover:text-white">Telegram {site.telegramName}</a></li>
            <li><a href={site.instagram} className="hover:text-white">Instagram</a></li>
            <li><a href={`tel:${site.phone.replace(/\s/g, '')}`} className="hover:text-white">{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-site flex flex-col justify-between gap-2 py-6 text-xs text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} {site.full}. {t('rights')}</span>
          <span>Toshkent, O'zbekiston</span>
        </div>
      </div>
    </footer>
  );
}
