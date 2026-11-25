// SEO yordamchilari: sayt manzili va schema.org (JSON-LD) ma'lumotlari.
import { site } from './site';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');

export const abs = (u) => {
  if (!u) return undefined;
  if (/^https?:\/\//.test(u)) return u;
  return `${SITE_URL}${String(u).startsWith('/') ? '' : '/'}${u}`;
};

const tel = (p) => (p ? String(p).replace(/\s/g, '') : undefined);

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: site.full,
    alternateName: site.aliases,
    url: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
    email: site.email,
    sameAs: [site.telegram, site.instagram].filter(Boolean),
    areaServed: 'UZ',
    contactPoint: [site.phone, site.phone2].filter(Boolean).map((p) => ({
      '@type': 'ContactPoint',
      telephone: tel(p),
      contactType: 'customer support',
      areaServed: 'UZ',
      availableLanguage: ['uz', 'ru'],
    })),
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: site.full,
    alternateName: site.aliases,
    inLanguage: 'uz',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

// Mahsulot / skin sahifasi uchun: narx so'mda, mavjud
export function productLd({ id, name, description, image, priceUzs, url, category }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    sku: String(id),
    url: abs(url),
    ...(description ? { description } : {}),
    ...(image ? { image: [abs(image)] } : {}),
    ...(category ? { category } : {}),
  };
  const price = Number(priceUzs);
  if (price > 0) {
    ld.offers = {
      '@type': 'Offer',
      url: abs(url),
      priceCurrency: 'UZS',
      price: String(Math.round(price)),
      availability: 'https://schema.org/InStock',
      seller: { '@id': `${SITE_URL}/#organization` },
    };
  }
  return ld;
}

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.url),
    })),
  };
}
