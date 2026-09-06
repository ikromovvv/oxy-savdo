import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { listOrders } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

// GET /api/admin/orders?status=  — barcha buyurtmalar (faqat admin)
export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';

  try {
    const items = await listOrders({ status });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[api/admin/orders GET]', e.message);
    return NextResponse.json({ items: [], error: 'load_failed' }, { status: 200 });
  }
}
