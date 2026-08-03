import { NextResponse } from 'next/server';
import { getSkinImages } from '@/lib/skinImages';
import { byCategory } from '@/lib/products';

// Rasm maydoni bo'sh bo'lgan skinlar uchun CSGO-API'dan asl Steam rasm
// manzillarini qaytaradi: { images: { "AK-47 | Redline": "https://...", ... } }
export async function GET() {
  try {
    const names = byCategory('skins')
      .filter((p) => !p.image)
      .map((p) => p.name);

    if (names.length === 0) {
      return NextResponse.json({ images: {} });
    }

    const images = await getSkinImages(names);
    return NextResponse.json({ images });
  } catch (e) {
    console.error('[api/skin-images] xato:', e?.message || e);
    return NextResponse.json({ images: {} }, { status: 200 });
  }
}
