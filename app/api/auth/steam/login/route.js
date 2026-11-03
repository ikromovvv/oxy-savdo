import { NextResponse } from 'next/server';
import { buildSteamLoginUrl } from '@/lib/steamAuth';

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const url = buildSteamLoginUrl({
    returnTo: `${origin}/api/auth/steam/callback`,
    realm: origin,
  });
  const res = NextResponse.redirect(url);
  // Kirgandan keyin qaytish sahifasi (faqat sayt ichidagi yo'l): masalan /rozigrish?t=...
  const next = new URL(request.url).searchParams.get('next') || '';
  if (next.startsWith('/') && !next.startsWith('//') && next.length < 600) {
    res.cookies.set('oxy_next', next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });
  }
  return res;
}
