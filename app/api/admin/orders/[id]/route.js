import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getOrder, updateOrder, markOrderPaid } from '@/lib/orderStore';
import { fulfillOrder, pollFulfillment } from '@/lib/fulfillment';
import { settlePaidOrder, refundWalletOrder } from '@/lib/settle';

export const dynamic = 'force-dynamic';

// GET /api/admin/orders/[id]  — bitta buyurtma to'liq (faqat admin)
export async function GET(_req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const order = await getOrder(params.id);
    if (!order) return NextResponse.json({ order: null }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    console.error('[api/admin/orders/[id] GET]', e.message);
    return NextResponse.json({ order: null, error: 'load_failed' }, { status: 200 });
  }
}

// PATCH /api/admin/orders/[id]  — holat / izoh yangilash (faqat admin)
export async function PATCH(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  try {
    // maxsus amallar: avtomatik yetkazish / holatni poll qilish
    if (body.action === 'fulfill') {
      const r = await fulfillOrder(params.id, { force: Boolean(body.force) });
      const order = await getOrder(params.id);
      return NextResponse.json({ order, result: r });
    }
    if (body.action === 'poll') {
      const r = await pollFulfillment(params.id);
      const order = await getOrder(params.id);
      return NextResponse.json({ order, result: r });
    }

    // Admin "To'landi" bossa — to'lov ham "paid" deb qayd etiladi (balans to'ldirish
    // buyurtmasi bo'lsa hamyonga yoziladi, skin bo'lsa yetkazish boshlanadi).
    if (body.status === 'paid') {
      const r = await markOrderPaid(params.id, {
        provider: 'manual',
        providerTxnId: `manual-${params.id}`,
        performTime: Date.now(),
        by: 'admin',
        note: body.note || "Admin to'langan deb belgiladi",
      });
      if (r.error) return NextResponse.json({ error: r.error }, { status: 404 });
      await settlePaidOrder(params.id).catch((e) => console.error('[admin] settle:', e?.message));
      return NextResponse.json({ order: await getOrder(params.id) });
    }

    const before = ['cancelled', 'refunded'].includes(body.status) ? await getOrder(params.id) : null;
    const result = await updateOrder(params.id, {
      status: body.status,
      note: body.note,
      adminNote: body.adminNote,
      fulfillment: body.fulfillment,
      by: 'admin',
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    // balansdan to'langan buyurtma bekor / qaytarilsa — pul hamyonga qaytadi
    if (before) await refundWalletOrder(before).catch((e) => console.error('[admin] refund:', e?.message));
    return NextResponse.json({ order: result.order });
  } catch (e) {
    console.error('[api/admin/orders/[id] PATCH]', e.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
