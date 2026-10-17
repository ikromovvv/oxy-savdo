import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getWallet } from '@/lib/walletStore';
import { availableProviders } from '@/lib/payments';
import { DEPOSIT_MIN_UZS } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

// GET /api/wallet — kirgan foydalanuvchining balansi va oxirgi amallari.
// Balansni faqat server hisoblaydi; client faqat o'qiydi.
export async function GET() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session?.steamid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const w = await getWallet(session.steamid, { limit: 20 });
    // methods: onlayn to'ldirish usullari (bo'sh bo'lsa — Payme/Click hali ulanmagan)
    return NextResponse.json({ ...w, methods: availableProviders(), minDeposit: DEPOSIT_MIN_UZS });
  } catch (e) {
    console.error('[api/wallet]', e?.message || e);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
