import { NextResponse } from 'next/server';
import { getOrder, STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

// GET /api/pay/status/[ref] — to'lov qaytish sahifasi uchun (ochiq).
export async function GET(_req, { params }) {
  try {
    const o = await getOrder(params.ref);
    if (!o) return NextResponse.json({ order: null }, { status: 404 });
    return NextResponse.json({
      order: {
        ref: o.ref,
        status: o.status,
        statusLabel: STATUS_LABEL[o.status] || o.status,
        total: o.total,
        payment: {
          status: o.payment?.status || 'none',
          statusLabel: PAYMENT_STATUS_LABEL[o.payment?.status || 'none'],
          provider: o.payment?.provider || null,
        },
      },
    });
  } catch (e) {
    return NextResponse.json({ order: null, error: 'load_failed' }, { status: 200 });
  }
}
