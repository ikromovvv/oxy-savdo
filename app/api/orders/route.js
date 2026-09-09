import { NextResponse } from 'next/server';
import { createOrder, setPayment, updateOrder } from '@/lib/orderStore';
import { createPayment } from '@/lib/payments';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// POST /api/orders — savatdan yangi buyurtma yaratadi (ochiq)
export async function POST(req) {
  const limited = await limitOr429(req, 'orders', { limit: 12, windowSec: 300 });
  if (limited) return limited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  try {
    const result = await createOrder(body);
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    // to'lov provayderi faol bo'lsa — to'lov linkini yaratamiz
    let payUrl = null;
    let provider = 'manual';
    try {
      const origin = new URL(req.url).origin;
      const pay = createPayment(result.order, origin);
      provider = pay.provider;
      payUrl = pay.payUrl;
      if (provider !== 'manual') {
        await setPayment(result.order.id, { provider, status: 'pending' });
        // buyurtma "to'lov kutilmoqda" holatiga o'tadi
        await updateOrder(result.order.id, {
          status: 'pending',
          by: 'system',
          note: `${provider} to'lov havolasi yaratildi`,
        });
      }
    } catch (e) {
      console.error('[api/orders] payment init xato:', e.message);
    }

    const { id, ref, status, total, createdAt } = result.order;
    return NextResponse.json(
      { ok: true, order: { id, ref, status, total, createdAt }, payUrl, provider },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/orders POST]', e.message);
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 });
  }
}
