import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getPriceOverrides, setPriceOverride } from '@/lib/priceOverrides';

export const dynamic = 'force-dynamic';

// GET  /api/admin/price-overrides            — barcha qo'lda belgilangan narxlar
// POST /api/admin/price-overrides            — { key, addUsd? , fixedUsd? }  (bo'sh = o'chirish)
//   key: market_hash_name (masalan "AK-47 | Redline (Field-Tested)") yoki listingId.
//   addUsd   — foydaga qo'shimcha (+$1, +$3 ...); fixedUsd — qat'iy sotuv narxi (USD).
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ overrides: await getPriceOverrides() });
}

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || '').trim();
  if (!key) return NextResponse.json({ error: 'key_required' }, { status: 400 });
  const overrides = await setPriceOverride(key, { addUsd: body.addUsd, fixedUsd: body.fixedUsd });
  return NextResponse.json({ ok: true, overrides });
}
