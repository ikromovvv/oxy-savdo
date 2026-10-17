import { NextResponse } from 'next/server';
import { getOrder, markOrderPaid } from '@/lib/orderStore';
import { activeProvider } from '@/lib/payments';
import { settlePaidOrder } from '@/lib/settle';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Faqat PAYMENT_PROVIDER=test bo'lganda ishlaydi. Buyurtmani darhol "to'landi"
// qiladi — real to'lovsiz, demo/ishlab chiqish uchun.
export async function POST(req, { params }) {
  // production'da HECH QACHON ishlamaydi (bepul to'lov teshigi bo'lmasligi uchun)
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 });
  }
  const limited = await limitOr429(req, 'pay-test', { limit: 20, windowSec: 60 });
  if (limited) return limited;
  const o = await getOrder(params.ref);
  if (!o) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  // faqat test provayderi yoki lokal demo to'lov sahifasi orqali yaratilgan buyurtma
  if (activeProvider() !== 'test' && o.payment?.provider !== 'demo') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 });
  }
  if (o.payment?.status !== 'paid') {
    await markOrderPaid(o.id, { provider: 'test', by: 'test' });
  }
  await settlePaidOrder(o.id);
  return NextResponse.json({ ok: true });
}
