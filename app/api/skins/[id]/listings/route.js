import { NextResponse } from 'next/server';
import { getSkinById } from '@/lib/skinportFeed';
import { getLisListings, lisSourceActive } from '@/lib/lisListings';

export const dynamic = 'force-dynamic';

// GET /api/skins/[id]/listings — shu skinning hozir sotib olsa bo'ladigan nusxalari
// (float, naqsh, stikerlar, inspect havola). Faqat SKINS_SOURCE=lis bo'lganda.
export async function GET(_req, { params }) {
  if (!lisSourceActive()) return NextResponse.json({ listings: [], supported: false });
  try {
    const item = await getSkinById(params.id);
    if (!item) return NextResponse.json({ listings: [], supported: true }, { status: 404 });
    const listings = await getLisListings(item.fullName, { limit: 30 });
    return NextResponse.json(
      { listings, supported: true },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (e) {
    console.error('[api/skins/listings]', e?.message || e);
    return NextResponse.json({ listings: [], supported: true, error: 'load_failed' }, { status: 200 });
  }
}
