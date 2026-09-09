import { NextResponse } from 'next/server';
import { getOrder, markOrderPaid } from '@/lib/orderStore';
import { activeProvider } from '@/lib/payments';
import { maybeAutoFulfill } from '@/lib/fulfillment';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Faqat PAYMENT_PROVIDER=test bo'lganda ishlaydi. Buyurtmani darhol "to'landi"
// qiladi — real to'lovsiz, demo/ishlab chiqish uchun.
export async function POST(req, { params }) {
  if (activeProvider() !== 'test' || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 });
  }
  const limited = await limitOr429(req, 'pay-test', { limit: 20, windowSec: 60 });
  if (limited) return limited;
  const o = await getOrder(params.ref);
  if (!o) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (o.payment?.status !== 'paid') {
    await markOrderPaid(o.id, { provider: 'test', by: 'test' });
  }
  await maybeAutoFulfill(o.id);
  return NextResponse.json({ ok: true });
}
