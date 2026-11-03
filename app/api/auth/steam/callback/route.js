import { NextResponse } from 'next/server';
import { verifySteamAssertion, fetchSteamProfile } from '@/lib/steamAuth';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const steamId = await verifySteamAssertion(url.searchParams);
    if (!steamId) {
      return NextResponse.redirect(`${origin}/?steam_error=1`);
    }

    const profile = await fetchSteamProfile(steamId);
    const token = createSessionToken({
      steamid: profile.steamid,
      name: profile.name,
      avatar: profile.avatar,
      profileUrl: profile.profileUrl,
      exp: Date.now() + THIRTY_DAYS * 1000,
    });

    const next = request.cookies.get('oxy_next')?.value || '';
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
    const res = NextResponse.redirect(`${origin}${safeNext}`);
    res.cookies.set('oxy_next', '', { path: '/', maxAge: 0 });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });
    return res;
  } catch (e) {
    return NextResponse.redirect(`${origin}/?steam_error=1`);
  }
}
