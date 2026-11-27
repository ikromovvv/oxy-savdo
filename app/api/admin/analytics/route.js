import { NextResponse } from 'next/server';
import { canViewStats } from '@/lib/adminAuth';
import { getTrafficStats, getUserStats } from '@/lib/analyticsStore';
import { getTelegramStats, getSalesStats } from '@/lib/adminStats';

export const dynamic = 'force-dynamic';

// GET /api/admin/analytics?section=overview|telegram|sales|traffic|users
// To'liq admin ham, faqat-statistika akkaunti ham o'qiy oladi (hech narsa o'zgartirmaydi).
export async function GET(req) {
  if (!canViewStats()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const section = new URL(req.url).searchParams.get('section') || 'overview';

  try {
    if (section === 'telegram') return NextResponse.json(await getTelegramStats());
    if (section === 'sales') return NextResponse.json(await getSalesStats());
    if (section === 'traffic') return NextResponse.json(await getTrafficStats());
    if (section === 'users') return NextResponse.json(await getUserStats());
    if (section === 'overview') {
      const [tg, sales, traffic, users] = await Promise.all([
        getTelegramStats().catch(() => null),
        getSalesStats().catch(() => null),
        getTrafficStats().catch(() => null),
        getUserStats().catch(() => null),
      ]);
      return NextResponse.json({ tg, sales, traffic, users });
    }
    return NextResponse.json({ error: 'unknown_section' }, { status: 400 });
  } catch (e) {
    console.error('[api/admin/analytics]', section, e?.message || e);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
