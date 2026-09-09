import { NextResponse } from 'next/server';
import { handleClickComplete } from '@/lib/pay/click';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

async function readParams(req) {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await req.json();
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

// Click "Complete URL":
//   https://<domen>/api/pay/click/complete
export async function POST(req) {
  const limited = await limitOr429(req, 'pay-click', { limit: 120, windowSec: 60 });
  if (limited) return limited;
  try {
    const p = await readParams(req);
    const result = await handleClickComplete(p);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[pay/click/complete]', e?.message || e);
    return NextResponse.json({ error: -8, error_note: 'Internal error' });
  }
}
