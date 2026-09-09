import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { listOrders } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = ['paid', 'fulfilling', 'sent', 'done'];

function isPaid(o) {
  if (o.status === 'refunded' || o.status === 'cancelled') return false;
  return o.payment?.status === 'paid' || PAID_STATUSES.includes(o.status);
}

// GET /api/admin/stats — dashboard uchun server tomonda hisoblangan ko'rsatkichlar
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const all = await listOrders({});
    const now = new Date();
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const counts = {
      total: all.length,
      today: all.filter((o) => o.createdAt >= startOfDay).length,
      completed: all.filter((o) => o.status === 'done').length,
      pendingPayments: all.filter(
        (o) => o.status === 'pending' || o.payment?.status === 'pending'
      ).length,
      fulfilling: all.filter((o) => o.status === 'fulfilling').length,
      failed: all.filter((o) => o.fulfillment?.status === 'error').length,
    };

    const paid = all.filter(isPaid);
    const revenue = {
      today: paid.filter((o) => o.createdAt >= startOfDay).reduce((s, o) => s + (Number(o.total) || 0), 0),
      month: paid.filter((o) => o.createdAt >= startOfMonth).reduce((s, o) => s + (Number(o.total) || 0), 0),
      total: paid.reduce((s, o) => s + (Number(o.total) || 0), 0),
    };

    // oxirgi 30 kunlik kunlik seriya (grafik uchun; frontend hafta/oyga guruhlaydi)
    const days = 30;
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const from = d.getTime();
      const to = from + 86400000;
      const inDay = paid.filter((o) => o.createdAt >= from && o.createdAt < to);
      series.push({
        d: d.toISOString().slice(0, 10),
        revenue: inDay.reduce((s, o) => s + (Number(o.total) || 0), 0),
        count: inDay.length,
      });
    }

    const recent = [...all]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        ref: o.ref,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        customerName: o.customer?.name || '',
        nItems: (o.items || []).length,
      }));

    return NextResponse.json({ counts, revenue, series, recent });
  } catch (e) {
    console.error('[api/admin/stats]', e?.message || e);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
