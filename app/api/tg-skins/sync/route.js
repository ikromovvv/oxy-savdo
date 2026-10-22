import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { syncChannel } from '@/lib/tgSync';

export const dynamic = 'force-dynamic';

// Kanalni darhol qayta o'qish. Himoya: admin sessiyasi yoki cron secret (Bearer).
function authorized(req) {
  const hdr = req.headers.get('authorization') || '';
  for (const s of [process.env.FULFILL_CRON_SECRET, process.env.CRON_SECRET]) {
    if (s && hdr === `Bearer ${s}`) return true;
  }
  return isAdmin();
}

async function run(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await syncChannel());
}

export const GET = run; // Vercel Cron GET bilan chaqiradi
export const POST = run;
