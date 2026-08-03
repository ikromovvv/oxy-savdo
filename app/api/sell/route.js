import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// Skin sotish so'rovini Telegram'ga yuboradi (order/route.js bilan bir xil andoza).
// .env.local: TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID to'ldirilmagan bo'lsa,
// so'rov serverda log qilinadi (sayt baribir ishlaydi).

const PAYOUT_LABEL = {
  balance: 'Balans',
  cards: 'Karta',
  crypto: 'Kripto',
};

export async function POST(req) {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    const session = verifySessionToken(token);
    if (!session?.steamid) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { items = [], total = 0, payout, contact = {} } = data;
    const { phone = '', tg = '' } = contact;

    if (!Array.isArray(items) || items.length === 0 || (!phone && !tg)) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
    }

    const lines = items
      .map((i) => `• ${i.name}${i.exterior ? ` (${i.exterior})` : ''} — $${Number(i.price || 0).toFixed(2)}`)
      .join('\n');

    const text =
      `💰 Yangi SKIN SOTISH so'rovi\n\n` +
      `🎮 Steam: ${session.name} — ${session.profileUrl}\n` +
      (phone ? `📞 ${phone}\n` : '') +
      (tg ? `✈️ ${tg}\n` : '') +
      `💳 To'lov usuli: ${PAYOUT_LABEL[payout] || payout || '—'}\n\n` +
      `${lines}\n\n` +
      `💵 Jami: $${Number(total).toFixed(2)}`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chat) {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text }),
      });
      if (!res.ok) throw new Error('telegram failed');
    } else {
      console.log('[SELL]\n' + text);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
