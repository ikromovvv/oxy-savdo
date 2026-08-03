import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
