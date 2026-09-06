import { NextResponse } from 'next/server';
import { getSkinById, getRelatedSkins } from '@/lib/skinportFeed';
import { getSkinMeta } from '@/lib/skinImages';

function withMeta(p, meta) {
  const m = meta[p.name] || {};
  return {
    ...p,
    image: m.image || p.image || '',
    rarity: m.rarity || null,
    rarityColor: m.rarityColor || null,
    minFloat: m.minFloat ?? null,
    maxFloat: m.maxFloat ?? null,
  };
}

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

    let meta = {};
    try {
      meta = await getSkinMeta(names);
    } catch (e) {}

    return NextResponse.json({
      item: withMeta(item, meta),
      related: related.map((r) => withMeta(r, meta)),
    });
  } catch (e) {
    console.error('[api/skins/[id]] xato:', e?.code || e?.message || e);
    return NextResponse.json(
      { item: null, error: e?.code || 'fetch_failed' },
      { status: 200 }
    );
  }
}
