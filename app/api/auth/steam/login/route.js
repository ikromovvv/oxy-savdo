import { NextResponse } from 'next/server';
import { buildSteamLoginUrl } from '@/lib/steamAuth';

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const url = buildSteamLoginUrl({
    returnTo: `${origin}/api/auth/steam/callback`,
    realm: origin,
  });
  return NextResponse.redirect(url);
}
