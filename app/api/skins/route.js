import { NextResponse } from 'next/server';
import { queryCatalog } from '@/lib/lisSkinsFeed';
import { getSkinImages } from '@/lib/skinImages';

// Skinlar katalogini LIS-SKINS'ning ochiq narxlar eksportidan olib,
// filtr/qidiruv/saralash/sahifalash bilan qaytaradi. Rasm — CSGO-API orqali
// nomi bo'yicha topilib, shu javobga qo'shib yuboriladi.
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const filters = {
    query: searchParams.get('query') || '',
    weaponType: searchParams.get('weaponType') || 'all',
    wear: searchParams.get('wear') || 'all',
    priceFrom: searchParams.get('priceFrom') || '',
    priceTo: searchParams.get('priceTo') || '',
    sort: searchParams.get('sort') || 'price_desc',
    limit: searchParams.get('limit') || 60,
    offset: searchParams.get('offset') || 0,
  };

  try {
    const { total, items, weaponTypes } = await queryCatalog(filters);

    let images = {};
    try {
      images = await getSkinImages(items.map((p) => p.name));
    } catch (e) {
      // rasm topilmasa ham katalogni ko'rsataveramiz
    }

    const withImages = items.map((p) => ({ ...p, image: images[p.name] || '' }));

    return NextResponse.json({ total, items: withImages, weaponTypes });
  } catch (e) {
    console.error('[api/skins] xato:', e?.code || e?.message || e, e?.status ? `HTTP ${e.status}` : '', e?.stack || '');
    return NextResponse.json(
      {
        error: e?.code || 'fetch_failed',
        status: e?.status || null,
        detail: e?.detail || e?.message || null,
        total: 0,
        items: [],
        weaponTypes: [],
      },
      { status: 200 }
    );
  }
}
