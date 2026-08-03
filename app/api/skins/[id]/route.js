import { NextResponse } from 'next/server';
import { getSkinById, getRelatedSkins } from '@/lib/lisSkinsFeed';
import { getSkinImages } from '@/lib/skinImages';

// Bitta skinni id (slug) bo'yicha, o'xshash skinlar bilan birga qaytaradi.
// Mahsulot sahifasi (/mahsulot/[id]) statik ro'yxatda topilmasa shu yerga murojaat qiladi.
export async function GET(request, { params }) {
  try {
    const item = await getSkinById(params.id);
    if (!item) {
      return NextResponse.json({ item: null }, { status: 404 });
    }

    const related = await getRelatedSkins(item.id, item.weaponType, 4);
    const names = [item.name, ...related.map((r) => r.name)];

    let images = {};
    try {
      images = await getSkinImages(names);
    } catch (e) {}

    const withImages = { ...item, image: images[item.name] || '' };
    const relatedWithImages = related.map((r) => ({ ...r, image: images[r.name] || '' }));

    return NextResponse.json({ item: withImages, related: relatedWithImages });
  } catch (e) {
    console.error('[api/skins/[id]] xato:', e?.code || e?.message || e);
    return NextResponse.json(
      { item: null, error: e?.code || 'fetch_failed' },
      { status: 200 }
    );
  }
}
