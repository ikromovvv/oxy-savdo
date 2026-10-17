import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { createDepositOrder, setPayment, updateOrder } from '@/lib/orderStore';
import { createPayment, availableProviders } from '@/lib/payments';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// POST /api/wallet/deposit { amount } — balansni to'ldirish buyurtmasini yaratadi.
// Pul balansga FAQAT to'lov provayderi (Payme/Click) tasdiqlagandan keyin yoki
// admin "to'landi" deb belgilagandan keyin tushadi (lib/settle.js).
export async function POST(req) {
  const limited = await limitOr429(req, 'deposit', { limit: 10, windowSec: 300 });
  if (limited) return limited;

  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session?.steamid) {
    return NextResponse.json({ ok: false, error: 'Steam orqali kiring' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  // To'lov provayderi (Payme/Click) ulanmagan bo'lsa — osilib qoladigan qo'lda tasdiqlanadigan
  // so'rov yaratmaymiz: balans faqat provayder tasdiqlaganda avtomatik to'ldiriladi.
  if (availableProviders().length === 0) {
    return NextResponse.json(
      { ok: false, error: "Online to'lov hali ulanmagan", code: 'no_provider' },
      { status: 503 }
    );
  }

  try {
    const result = await createDepositOrder({
      steam: { steamid: session.steamid, name: session.name, profileUrl: session.profileUrl },
      amount: body?.amount,
    });
    if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    const { order } = result;

    let payUrl = null;
    let provider = 'manual';
    try {
      // faqat serverda sozlangan usullardan biri; boshqa qiymat e'tiborsiz
      const methods = availableProviders();
      const wanted = methods.includes(body?.provider) ? body.provider : methods[0];
      const pay = createPayment(order, new URL(req.url).origin, wanted);
      provider = pay.provider;
      payUrl = pay.payUrl;
      if (provider !== 'manual') {
        await setPayment(order.id, { provider, status: 'pending' });
        await updateOrder(order.id, { status: 'pending', by: 'system', note: `${provider} to'lov havolasi yaratildi` });
      }
    } catch (e) {
      console.error('[api/wallet/deposit] payment init:', e?.message);
    }

    return NextResponse.json(
      { ok: true, ref: order.ref, amount: order.total, payUrl, provider },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/wallet/deposit]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 });
  }
}
