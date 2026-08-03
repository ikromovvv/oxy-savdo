import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session) return NextResponse.json({ loggedIn: false });

  return NextResponse.json({
    loggedIn: true,
    steamid: session.steamid,
    name: session.name,
    avatar: session.avatar,
    profileUrl: session.profileUrl,
  });
}
