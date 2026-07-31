import { NextResponse } from 'next/server';

// Telegram'ga buyurtma yuborish uchun .env.local faylida quyidagilarni to'ldiring:
// TELEGRAM_BOT_TOKEN=...
// TELEGRAM_CHAT_ID=...
// Agar to'ldirilmagan bo'lsa, buyurtma serverda log qilinadi (sayt baribir ishlaydi).

export async function POST(req) {
  try {
    const data = await req.json();
    const { name, phone, tg, note, items = [], total = 0 } = data;

    if (!name || !phone || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
    }

    const lines = items.map((i) => `• ${i.name} × ${i.qty} — ${i.price * i.qty} so'm`).join('\n');
    const text =
      `🛒 Yangi buyurtma\n\n` +
      `👤 ${name}\n📞 ${phone}\n` +
      (tg ? `✈️ ${tg}\n` : '') +
      (note ? `📝 ${note}\n` : '') +
      `\n${lines}\n\n💰 Jami: ${total} so'm`;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;

    if (token && chat) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text }),
      });
      if (!res.ok) throw new Error('telegram failed');
    } else {
      console.log('[ORDER]\n' + text);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
