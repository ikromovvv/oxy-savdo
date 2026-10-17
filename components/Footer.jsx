'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from './StoreProvider';
import { site } from '@/lib/site';
import OxyLogo from './OxyLogo';

export default function Footer() {
  const { t } = useStore();
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="mt-24 border-t border-line bg-panel/40">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center">
            <OxyLogo size={26} />
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted">{t('hero_text')}</p>
        </div>

        <div>
          <div className="label">{t('footer_shop')}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link href="/katalog/skins" className="inline-block py-1 hover:text-white">{t('nav_skins')}</Link></li>
            <li><Link href="/katalog/kovriklar" className="inline-block py-1 hover:text-white">{t('nav_pads')}</Link></li>
            <li><Link href="/katalog/aksessuar" className="inline-block py-1 hover:text-white">{t('nav_acc')}</Link></li>
          </ul>
        </div>

        <div>
          <div className="label">{t('footer_info')}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link href="/parvarish" className="inline-block py-1 hover:text-white">{t('nav_care')}</Link></li>
            <li><Link href="/yordam" className="inline-block py-1 hover:text-white">{t('nav_support')}</Link></li>
            <li><Link href="/yordam#qaytarish" className="inline-block py-1 hover:text-white">{t('returns')}</Link></li>
            <li><Link href="/yordam#oferta" className="inline-block py-1 hover:text-white">{t('offer')}</Link></li>
          </ul>
        </div>

        <div>
          <div className="label">{t('footer_contact')}</div>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><a href={site.telegram} className="inline-block py-1 hover:text-white">Telegram {site.telegramName}</a></li>
            <li><a href={site.instagram} className="inline-block py-1 hover:text-white">Instagram</a></li>
            <li><a href={`tel:${site.phone.replace(/\s/g, '')}`} className="inline-block py-1 hover:text-white">{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`} className="inline-block py-1 hover:text-white">{site.email}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-site flex flex-col justify-between gap-2 py-6 text-xs text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} {site.full}. {t('rights')}</span>
          <span className="flex items-center gap-3">
            <Link href="/admin" className="inline-block py-1 hover:text-white">Admin</Link>
            <span>Toshkent, O&apos;zbekiston</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
