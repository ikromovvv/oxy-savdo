import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/orderStore';
import { STATUS_LABEL } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

// GET /api/orders/[id] — buyurtma holatini kuzatish (ochiq; id maxfiy token)
export async function GET(_req, { params }) {
  try {
    const o = await getOrder(params.id);
    if (!o) return NextResponse.json({ order: null }, { status: 404 });

    // ommaviy javob — shaxsiy ma'lumotlarsiz
    return NextResponse.json({
      order: {
        ref: o.ref,
        status: o.status,
        statusLabel: STATUS_LABEL[o.status] || o.status,
        total: o.total,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        history: (o.history || []).map((h) => ({ at: h.at, status: h.status })),
      },
    });
  } catch (e) {
    console.error('[api/orders/[id] GET]', e.message);
    return NextResponse.json({ order: null, error: 'load_failed' }, { status: 200 });
  }
}
