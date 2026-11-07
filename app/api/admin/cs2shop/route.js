import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { activeProvider } from '@/lib/fulfillment';
import { configured, balance, setWebhook } from '@/lib/fulfill/cs2shop';

export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');

// GET  /api/admin/cs2shop  — ulanish holati + balans (USD)
// POST /api/admin/cs2shop  { action: 'webhook' } — webhook URL'ni cs2shop'da ro'yxatdan o'tkazadi
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const out = {
    configured: configured(),
    skinsSource: (process.env.SKINS_SOURCE || 'skinport').toLowerCase(),
    fulfillProvider: activeProvider(),
    webhookUrl: `${SITE}/api/cs2shop/webhook`,
  };
  if (out.configured) {
    try {
      Object.assign(out, await balance());
    } catch (e) {
      out.balanceError = e.message;
    }
  }
  return NextResponse.json(out);
}

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: 'not_configured' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'webhook') return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  try {
    const r = await setWebhook(`${SITE}/api/cs2shop/webhook`);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}
