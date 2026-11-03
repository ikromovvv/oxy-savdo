import { NextResponse } from 'next/server';
import { verifyInitData } from '@/lib/tgWebApp';
import { giveawayEnabled, joinStatus } from '@/lib/giveawayBot';

export const dynamic = 'force-dynamic';

// POST /api/giveaway/join  { initData, msg? }
// Mini App ichidan chaqiriladi: foydalanuvchini initData imzosi bilan aniqlaydi, shartlarni tekshiradi.
export async function POST(req) {
  if (!giveawayEnabled()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const user = verifyInitData(String(body.initData || ''), process.env.GIVEAWAY_BOT_TOKEN);
  if (!user) return NextResponse.json({ ok: false, error: 'bad_init_data' }, { status: 401 });
  const msg = Number(body.msg);
  const res = await joinStatus(user, Number.isFinite(msg) && msg > 0 ? msg : null);
  return NextResponse.json({ ok: true, ...res });
}
