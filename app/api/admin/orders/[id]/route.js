import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getOrder, updateOrder } from '@/lib/orderStore';
import { fulfillOrder, pollFulfillment, maybeAutoFulfill } from '@/lib/fulfillment';

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
    // operator qo'lda "To'landi" qilsa — avtomatik yetkazishni ham urinib ko'ramiz
    if (body.status === 'paid') maybeAutoFulfill(params.id).catch(() => {});
    return NextResponse.json({ order: result.order });
  } catch (e) {
    console.error('[api/admin/orders/[id] PATCH]', e.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
