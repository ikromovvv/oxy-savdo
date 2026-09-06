import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { runFulfillmentTick, activeProvider } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

// Kutilayotgan buyurtmalarni yetkazishga topshiradi / holatini poll qiladi.
// Vercel Cron shu manzilga har daqiqa murojaat qiladi (vercel.json).
// Himoya: Authorization: Bearer <FULFILL_CRON_SECRET>  yoki admin sessiyasi.
async function run() {
  const summary = await runFulfillmentTick();
  return NextResponse.json({ ok: true, provider: activeProvider(), summary });
}

function authorized(req) {
  const hdr = req.headers.get('authorization') || '';
  // FULFILL_CRON_SECRET yoki Vercel Cron'ning CRON_SECRET
  for (const s of [process.env.FULFILL_CRON_SECRET, process.env.CRON_SECRET]) {
    if (s && hdr === `Bearer ${s}`) return true;
  }
  return isAdmin();
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return run();
}

// Vercel Cron GET bilan chaqiradi
export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return run();
}
