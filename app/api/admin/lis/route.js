import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { activeProvider } from '@/lib/fulfillment';
import { configured, balance, buy, status, purchaseHistory, cheapestUnlocked } from '@/lib/fulfill/lis';
import { sendCs2shop, checkLowBalance, cs2shopChatId } from '@/lib/cs2shopAlerts';
import { parseTradeUrl } from '@/lib/steamTrade';
import { getSkinMeta } from '@/lib/skinImages';
import { parseSkinName } from '@/lib/skinNames';

export const dynamic = 'force-dynamic';

const TEST_MAX_USD = 2; // test savdo narxi yuqori chegarasi

// GET  /api/admin/lis                     — ulanish holati + balans + so'nggi xaridlar
// GET  /api/admin/lis?ref=TEST-...        — test savdo holati
// POST { action: 'test_alert' }           — guruhga test xabar
// POST { action: 'check_balance' }        — balansni hozir tekshiradi (kam bo'lsa guruhga yozadi)
// POST { action: 'test_buy', tradeUrl }   — eng arzon QULFSIZ skinni (<= $2) adminning trade-linkiga REAL sotib oladi
export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const ref = sp.get('ref');
  if (ref) {
    if (!/^TEST-[A-Za-z0-9~-]{4,60}$/.test(ref)) return NextResponse.json({ error: 'bad_ref' }, { status: 400 });
    return NextResponse.json({ ref, ...(await status(ref)) });
  }

  if (!configured()) return NextResponse.json({ configured: false });
  try {
    const [bal, hist] = await Promise.all([balance(), purchaseHistory({ page: 1 })]);

    const flat = [];
    for (const p of hist.purchases) {
      for (const s of p.skins || []) flat.push({ purchase: p, skin: s });
    }
    const shown = flat.slice(0, 50);
    const baseName = (n) => {
      const x = parseSkinName(n || '');
      return x ? `${x.weaponBase} | ${x.skinName}` : n;
    };
    const names = [...new Set(shown.map((x) => baseName(x.skin.name)).filter(Boolean))];
    const meta = names.length ? await getSkinMeta(names).catch(() => ({})) : {};

    const by = {};
    for (const x of flat) {
      const k = String(x.skin.status || '').toLowerCase();
      by[k] = (by[k] || 0) + 1;
    }

    return NextResponse.json({
      configured: true,
      ...bal,
      skinsSource: (process.env.SKINS_SOURCE || 'skinport').toLowerCase(),
      fulfillProvider: activeProvider(),
      total: hist.total,
      byStatus: by,
      purchases: shown.map(({ purchase: p, skin: s }) => {
        const m = meta[baseName(s.name)] || {};
        return {
          purchaseId: p.purchase_id,
          customId: p.custom_id || null,
          steamId: p.steam_id || null,
          createdAt: p.created_at,
          item: s.name,
          priceUsd: s.price,
          status: s.status,
          returnReason: s.return_reason || null,
          error: s.error || null,
          offerId: s.steam_trade_offer_id || null,
          offerCreatedAt: s.steam_trade_offer_created_at || null,
          offerFinishedAt: s.steam_trade_offer_finished_at || null,
          image: m.image || null,
          rarity: m.rarity || null,
          rarityColor: m.rarityColor || null,
        };
      }),
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: e.message }, { status: 502 });
  }
}

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'test_alert') {
    const r = await sendCs2shop('✅ OXY SAVDO: yetkazib beruvchi guruhi ulandi (LIS-SKINS). Bu test xabar.');
    return NextResponse.json({ ...r, chatConfigured: Boolean(cs2shopChatId()) }, { status: r.ok ? 200 : 502 });
  }

  if (!configured()) return NextResponse.json({ error: 'not_configured' }, { status: 400 });

  if (body.action === 'check_balance') {
    try {
      return NextResponse.json({ ok: true, ...(await checkLowBalance({ force: true })) });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  if (body.action === 'test_buy') {
    const tradeUrl = String(body.tradeUrl || '').trim();
    const trade = parseTradeUrl(tradeUrl);
    if (!trade) return NextResponse.json({ ok: false, error: "Trade URL noto'g'ri" }, { status: 400 });
    const maxUsd = Math.min(TEST_MAX_USD, Math.max(0.2, Number(body.maxUsd) || TEST_MAX_USD));

    try {
      const bal = await balance();
      const list = await cheapestUnlocked({ maxPriceUsd: maxUsd });
      const pick = list[0];
      if (!pick) return NextResponse.json({ ok: false, error: `$${maxUsd} gacha qulfsiz skin topilmadi` }, { status: 404 });
      if (bal.available < Number(pick.price)) {
        return NextResponse.json({ ok: false, error: `LIS balansi yetarli emas ($${bal.available} < $${pick.price})` }, { status: 400 });
      }

      const ref = `TEST-${Date.now().toString(36).toUpperCase()}`;
      const r = await buy({
        marketHashName: pick.name,
        listingId: pick.id,
        maxPriceUSD: maxUsd,
        salePriceUSD: maxUsd + 0.5,
        tradeUrl,
        partner: trade.partner,
        token: trade.token,
        customId: ref,
      });
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });

      const tg = await sendCs2shop(
        `🧪 LIS test savdo ${ref}\n${pick.name} · $${pick.price}\nHolat: ${r.state || 'processing'} (offer yuborildi, Steam'da qabul qiling)`
      );
      return NextResponse.json({
        ok: true,
        notified: tg.ok,
        notifyError: tg.ok ? undefined : tg.error,
        ref: r.providerRef || ref,
        item: pick.name,
        priceUsd: Number(pick.price),
        float: pick.item_float != null ? Number(pick.item_float) : null,
        state: r.state,
        detail: r.detail || null,
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
