import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { listOrders, STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

// GET /api/my/orders — kirgan foydalanuvchining o'z buyurtmalari (Steam sessiya bo'yicha).
export async function GET() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session?.steamid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const orders = await listOrders({ steamid: session.steamid });
    const safe = orders.map((o) => ({
      ref: o.ref,
      status: o.status,
      statusLabel: STATUS_LABEL[o.status] || o.status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      total: o.total,
      items: (o.items || []).map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        kind: i.kind,
      })),
      payment: {
        status: o.payment?.status || 'none',
        statusLabel: PAYMENT_STATUS_LABEL[o.payment?.status || 'none'],
        provider: o.payment?.provider || null,
      },
      fulfillment: {
        status: o.fulfillment?.status || 'none',
        provider: o.fulfillment?.provider || null,
        attempts: o.fulfillment?.attempts || 0,
      },
      // Faqat status o'zgarishlari — ichki izohlarsiz (adminNote chiqmaydi)
      history: (o.history || []).map((h) => ({ at: h.at, status: h.status })),
    }));
    return NextResponse.json({ orders: safe });
  } catch (e) {
    console.error('[api/my/orders]', e?.message || e);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
