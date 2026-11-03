import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { completeLink, readLinkToken } from '@/lib/giveawayBot';

export const dynamic = 'force-dynamic';

// POST /api/giveaway/link  { t }  — saytda Steam bilan kirgan foydalanuvchini bot tokeni orqali
// Telegram akkauntiga bog'laydi. Steam ID faqat imzolangan sessiya cookie'sidan olinadi.
export async function POST(req) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session?.steamid) {
    return NextResponse.json({ ok: false, error: 'not_logged_in' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const link = readLinkToken(String(body.t || ''));
  if (!link) {
    return NextResponse.json({ ok: false, error: 'bad_or_expired_token' }, { status: 400 });
  }

  const res = await completeLink({
    tgId: link.tgId,
    username: link.username,
    steamid: session.steamid,
    steamName: session.name || null,
  });
  if (res.error) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    subscribed: res.entry.subscribed,
    eligible: res.eligible,
    steamName: res.entry.steamName,
  });
}
