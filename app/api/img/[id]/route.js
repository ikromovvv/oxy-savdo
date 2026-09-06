import { kvGet } from '@/lib/kv';

export const dynamic = 'force-dynamic';

// KV rejimida saqlangan rasmlarni qaytaradi (data:URI -> binar javob).
export async function GET(_req, { params }) {
  let uri;
  try {
    uri = await kvGet(`oxy:img:${params.id}`);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!uri || typeof uri !== 'string' || !uri.startsWith('data:')) {
    return new Response('Not found', { status: 404 });
  }

  const m = /^data:([^;]+);base64,(.*)$/s.exec(uri);
  if (!m) return new Response('Bad image', { status: 500 });

  const body = Buffer.from(m[2], 'base64');
  return new Response(body, {
    headers: {
      'Content-Type': m[1],
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
