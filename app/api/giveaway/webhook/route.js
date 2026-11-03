import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleGiveawayUpdate } from '@/lib/giveawayBot';

export const dynamic = 'force-dynamic';

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// POST /api/giveaway/webhook — rozigrysh boti yangilanishlari.
// Faqat GIVEAWAY_WEBHOOK_SECRET bilan o'rnatilgan webhookdan qabul qilinadi.
export async function POST(req) {
  const secret = process.env.GIVEAWAY_WEBHOOK_SECRET;
  if (!secret || !process.env.GIVEAWAY_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'giveaway_not_configured' }, { status: 503 });
  }
  if (!safeEqual(req.headers.get('x-telegram-bot-api-secret-token'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let update;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  try {
    const r = await handleGiveawayUpdate(update);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    // 200 qaytaramiz: aks holda Telegram bir xil yangilanishni qayta-qayta yuboradi
    console.error('[giveaway/webhook]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'handler_failed' });
  }
}
