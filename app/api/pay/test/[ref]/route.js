import { NextResponse } from 'next/server';
import { getOrder, markOrderPaid } from '@/lib/orderStore';
import { activeProvider } from '@/lib/payments';
import { settlePaidOrder } from '@/lib/settle';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Sinov to'lovi: buyurtmani real to'lovsiz "to'landi" qiladi.
//  - Lokal ishlab chiqishda (NODE_ENV != production): test provayderi yoki demo
//    sahifasi orqali yaratilgan buyurtma uchun.
//  - Demo to'lov sahifasi orqali yaratilgan buyurtma (provider 'demo') har joyda,
//    PRODUCTION'da ham: pul HAQIQIY hamyonga emas, alohida demo hamyonga tushadi
//    (lib/settle.js), undan to'langan buyurtma yetkazilmaydi va tushumga kirmaydi.
//  - Boshqa buyurtmalar uchun production'da 403 (bepul to'lov teshigi yo'q).
export async function POST(req, { params }) {
  const limited = await limitOr429(req, 'pay-test', { limit: 20, windowSec: 60 });
  if (limited) return limited;

  const o = await getOrder(params.ref);
  if (!o) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const isDemoOrder = o.payment?.provider === 'demo';
  const prod = process.env.NODE_ENV === 'production';
  const allowed = isDemoOrder || (!prod && activeProvider() === 'test');
  if (!allowed) return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 });

  if (o.payment?.status !== 'paid') {
    await markOrderPaid(
      o.id,
      isDemoOrder
        ? { provider: 'demo', providerTxnId: `demo-${o.id}`, by: 'demo', note: "DEMO to'lov (haqiqiy pul emas)" }
        : { provider: 'test', by: 'test' }
    );
  }
  await settlePaidOrder(o.id);
  return NextResponse.json({ ok: true });
}
