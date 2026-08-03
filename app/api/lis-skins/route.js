import { NextResponse } from 'next/server';
import { getLisSkinsSample } from '@/lib/lisSkinsFeed';

// Diagnostika uchun: LIS-SKINS'ning ochiq narxlar eksportidan bir nechta
// namunani qaytaradi. Brauzerda /api/lis-skins ga kirib natijani ko'rish
// mumkin — shu natijani menga yuborsangiz, aniq mapping (nom/rasm/narx/holat)
// ni to'liq katalogga ulab beraman.
export async function GET() {
  try {
    const sample = await getLisSkinsSample(20);
    return NextResponse.json(sample);
  } catch (e) {
    console.error('[api/lis-skins] xato:', e?.code || e?.message || e, e?.status ? `HTTP ${e.status}` : '', e?.stack || '');
    return NextResponse.json(
      { error: e?.code || 'fetch_failed', status: e?.status || null, detail: e?.detail || e?.message || null },
      { status: 200 }
    );
  }
}
