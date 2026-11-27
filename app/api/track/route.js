import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { limitOr429 } from '@/lib/rateLimit';
import { recordVisit, isBot, validVid } from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

// POST /api/track { vid, hb? } — anonim tashrif / "tirikman" signali.
// Hech qachon xato qaytarib saytni sekinlashtirmaydi: har doim 204.
export async function POST(req) {
  try {
    if (isBot(req.headers.get('user-agent'))) return new NextResponse(null, { status: 204 });
    const limited = await limitOr429(req, 'track', { limit: 120, windowSec: 300 });
    if (limited) return new NextResponse(null, { status: 204 });

    const body = await req.json().catch(() => ({}));
    if (!validVid(body.vid)) return new NextResponse(null, { status: 204 });

    const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
    await recordVisit({ vid: body.vid, steamid: session?.steamid || null, hb: body.hb === true });
  } catch (e) {
    console.error('[track]', e?.message || e);
  }
  return new NextResponse(null, { status: 204 });
}
