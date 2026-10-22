import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ingestUpdate } from '@/lib/tgIngest';

export const dynamic = 'force-dynamic';

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// POST /api/telegram/webhook — Telegram bot yangilanishlari (kanal postlari).
// Faqat TELEGRAM_WEBHOOK_SECRET bilan o'rnatilgan webhookdan qabul qilinadi
// (Telegram har so'rovda X-Telegram-Bot-Api-Secret-Token yuboradi).
export async function POST(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 503 });
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
    const r = await ingestUpdate(update);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    // 200 emas, xato bersak Telegram qayta yuboradi (yo'qolmasin)
    console.error('[telegram/webhook]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'ingest_failed' }, { status: 500 });
  }
}
