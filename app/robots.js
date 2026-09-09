const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app'
).replace(/\/+$/, '');

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/buyurtmalarim', '/tolov/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
