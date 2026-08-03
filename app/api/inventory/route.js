import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getInventoryWithPrices } from '@/lib/steamInventory';

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session?.steamid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const items = await getInventoryWithPrices(session.steamid);
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[api/inventory] xato:', e?.code || e?.message || e, e?.detail || '');
    return NextResponse.json({
      error: e?.code || 'fetch_failed',
      detail: e?.detail || e?.message || null,
      status: e?.status || null,
    });
  }
}
