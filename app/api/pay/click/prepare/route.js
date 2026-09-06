import { NextResponse } from 'next/server';
import { handleClickPrepare } from '@/lib/pay/click';

export const dynamic = 'force-dynamic';

async function readParams(req) {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await req.json();
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

// Click "Prepare URL" — kabinetda shu manzilni ko'rsating:
//   https://<domen>/api/pay/click/prepare
export async function POST(req) {
  try {
    const p = await readParams(req);
    const result = await handleClickPrepare(p);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[pay/click/prepare]', e?.message || e);
    return NextResponse.json({ error: -8, error_note: 'Internal error' });
  }
}
