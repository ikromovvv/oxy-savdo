import { NextResponse } from 'next/server';
import { verifyWebhook } from '@/lib/fulfill/cs2shop';
import { pollFulfillment } from '@/lib/fulfillment';
import { notifyCs2shop } from '@/lib/cs2shopAlerts';

export const dynamic = 'force-dynamic';

// cs2shop webhook: POST /api/cs2shop/webhook
// Merchant panelda / SetEventWebhook orqali shu manzil (HTTPS) ro'yxatdan o'tkaziladi.
// Imzo: x-signature = hex HMAC-SHA256(rawBody, CS2SHOP_API_KEY).
// Callback takrorlanishi yoki kechikishi mumkin — holat har safar lookup orqali olinadi.

// externalRef = `${order.ref}-${itemId}-${n}[~k]` -> order.ref
const refOf = (externalId) => /^(OXY-[0-9A-F]{6})-/i.exec(String(externalId || ''))?.[1] || null;

export async function POST(req) {
  const raw = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get('x-signature') || '';
  const merchant = req.headers.get('x-merchant-id') || '';

  if (
    (process.env.CS2SHOP_MERCHANT_ID && merchant !== process.env.CS2SHOP_MERCHANT_ID) ||
    !verifyWebhook(raw, sig)
  ) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  // item_removed va boshqa hodisalar — ishlatilmaydi, 2xx qaytaramiz
  if (req.headers.get('x-webhook-type') !== 'trade_updated') return NextResponse.json({ ok: true });

  let ev;
  try {
    ev = JSON.parse(raw.toString('utf8'));
  } catch {
    return NextResponse.json({ ok: true });
  }

  const ref = refOf(ev.externalId);
  if (!ref) return NextResponse.json({ ok: true });

  try {
    await pollFulfillment(ref);
  } catch (e) {
    console.error('[cs2shop webhook] poll:', e.message); // cron qayta tekshiradi
  }

  // Yetkazilgandan keyin REVERSED bo'lsa — buyurtma 'done' bo'lib poll o'tkazib yuboradi, adminni ogohlantiramiz
  if (String(ev.status).toUpperCase() === 'REVERSED') {
    notifyCs2shop(
      `⚠️ cs2shop: savdo REVERSED — ${ref}\nSabab: ${ev.failReason || "noma'lum"}\nTekshiring: pul qaytarilishi / skin holati.`
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
