import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getWallet } from '@/lib/walletStore';
import { getWalletSummary } from '@/lib/settle';
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
    const sum = await getWalletSummary(session.steamid);
    // methods: onlayn to'ldirish usullari (bo'sh bo'lsa — Payme/Click hali ulanmagan)
    // balance = haqiqiy + demo (header'da ko'rinadi); payable = bitta buyurtmaga yetadigan summa
    return NextResponse.json({
      ...w,
      balance: sum.balance,
      realBalance: sum.real,
      demoBalance: sum.demo,
      payable: sum.payable,
      methods: availableProviders(),
      minDeposit: DEPOSIT_MIN_UZS,
    });
  } catch (e) {
    console.error('[api/wallet]', e?.message || e);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
