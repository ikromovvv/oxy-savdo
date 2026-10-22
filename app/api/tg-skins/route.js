import { NextResponse } from 'next/server';
import { getListings } from '@/lib/tgListings';

export const dynamic = 'force-dynamic';

// GET /api/tg-skins — Telegram kanaldagi skin e'lonlari (ochiq)
export async function GET() {
  try {
    const data = await getListings();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (e) {
    console.error('[api/tg-skins]', e?.message || e);
    return NextResponse.json({ items: [], error: 'load_failed' }, { status: 200 });
  }
}
