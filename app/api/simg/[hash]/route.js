// Skin rasmlari proksisi: Steam CDN (Akamai) O'zbekistondan sekin (0.7–2 s, kam uchraydiganlari 15+ s yoki 504).
// Bu yo'nalish rasmni Vercel serveridan (AQSh, Steam'ga tez) bir marta olib, Vercel CDN keshiga qo'yadi —
// keyingi barcha foydalanuvchilar uni o'zimizning domendan (tez, HTTP/2) oladi.
//
//   /api/simg/<steam-hash>?s=384   (s: 256 | 384 | 512)  ->  .../economy/image/<hash>/384fx288f

export const maxDuration = 30;

const HASH_RE = /^[A-Za-z0-9_-]{16,600}$/;
const SIZES = { 256: '256fx192f', 384: '384fx288f', 512: '512fx384f' };
const HOSTS = ['community.akamai.steamstatic.com', 'community.fastly.steamstatic.com', 'community.cloudflare.steamstatic.com'];
const ONE_YEAR = 60 * 60 * 24 * 365;

async function fetchImage(host, hash, dims) {
  const res = await fetch(`https://${host}/economy/image/${hash}/${dims}`, {
    headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0 oxy-savdo' },
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || 'image/png';
  if (!type.startsWith('image/')) throw new Error('not image');
  return { body: await res.arrayBuffer(), type };
}

export async function GET(req, { params }) {
  const hash = params.hash;
  if (!HASH_RE.test(hash)) return new Response('Bad request', { status: 400 });
  const s = new URL(req.url).searchParams.get('s') || '384';
  const dims = SIZES[s] || SIZES[384];

  for (const host of HOSTS) {
    try {
      const { body, type } = await fetchImage(host, hash, dims);
      return new Response(body, {
        headers: {
          'Content-Type': type,
          // brauzer 1 kun, Vercel CDN 1 yil (rasm hash'i o'zgarmaydi)
          'Cache-Control': `public, max-age=86400, s-maxage=${ONE_YEAR}, stale-while-revalidate=${ONE_YEAR}, immutable`,
        },
      });
    } catch {
      /* keyingi hostni sinaymiz */
    }
  }
  // Steam javob bermadi — brauzer o'zi Steam'dan olib ko'rsin (keshlanmaydi)
  return new Response(null, {
    status: 302,
    headers: { Location: `https://community.akamai.steamstatic.com/economy/image/${hash}/${dims}`, 'Cache-Control': 'no-store' },
  });
}
