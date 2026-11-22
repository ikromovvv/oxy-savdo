import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/orderStore';
import { pollFulfillment, maybeAutoFulfill } from '@/lib/fulfillment';
import { waitUntil } from '@vercel/functions';
import { STATUS_LABEL } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

// Holatni provayderdan so'rash tez-tez bo'lmasligi uchun (bir instance, bir buyurtma)
const lastPoll = new Map();
const POLL_EVERY_MS = 20000;
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r('timeout'), ms))]);

// GET /api/orders/[id] — buyurtma holatini kuzatish (ochiq; id maxfiy token)
export async function GET(_req, { params }) {
  try {
    let o = await getOrder(params.id);
    if (!o) return NextResponse.json({ order: null }, { status: 404 });

    // Yuborilgan buyurtma: LIS holatini yangilaymiz (kunlik cron'ni kutmaymiz). Xato bo'lsa — eski holat qaytadi.
    const now = Date.now();
    if (['fulfilling', 'sent'].includes(o.status) && now - (lastPoll.get(o.id) || 0) > POLL_EVERY_MS) {
      lastPoll.set(o.id, now);
      if (lastPoll.size > 500) lastPoll.delete(lastPoll.keys().next().value);
      try {
        await withTimeout(pollFulfillment(o.id), 8000);
        o = (await getOrder(params.id)) || o;
      } catch {
        /* eski holat */
      }
    } else if (o.status === 'paid' && now - (lastPoll.get(o.id) || 0) > POLL_EVERY_MS) {
      // to'langan, lekin yetkazish hali boshlanmagan (masalan, eski xato) — o'zi ichidagi qo'riqchilar bilan qayta uriniladi
      lastPoll.set(o.id, now);
      try {
        waitUntil(maybeAutoFulfill(o.id).catch(() => {}));
      } catch {
        /* waitUntil yo'q muhit */
      }
    }

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
