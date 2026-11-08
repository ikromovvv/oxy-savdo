import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { activeProvider } from '@/lib/fulfillment';
import { configured, balance, setWebhook, buy, status, tradesHistory, walletHistory } from '@/lib/fulfill/cs2shop';
import { fetchListings } from '@/lib/cs2shopFeed';
import { parseTradeUrl } from '@/lib/steamTrade';
import { sendCs2shop, checkLowBalance, cs2shopChatId } from '@/lib/cs2shopAlerts';
import { getSkinMeta } from '@/lib/skinImages';
import { parseSkinName } from '@/lib/skinNames';

export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app').replace(/\/+$/, '');
const TEST_MAX_USD = 2; // test savdo narxi yuqori chegarasi

// GET  /api/admin/cs2shop                     — ulanish holati + balans (USD)
// GET  /api/admin/cs2shop?ref=TEST-...        — test savdo holati
// POST /api/admin/cs2shop { action: 'webhook' }                       — webhook URL'ni ro'yxatdan o'tkazadi
// POST /api/admin/cs2shop { action: 'test_buy', tradeUrl, maxUsd? }   — eng arzon skinni (<= $2) adminning
//   trade-linkiga REAL sotib oladi (cs2shop balansidan yechiladi). Faqat admin.
export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const ref = sp.get('ref');
  const section = sp.get('section');

  // Panel bo'limlari: overview (balans + so'nggi savdolar + statistika) va wallet (hamyon tarixi)
  if (section === 'overview' || section === 'wallet') {
    if (!configured()) return NextResponse.json({ configured: false });
    try {
      if (section === 'wallet') {
        const page = Math.max(1, Number(sp.get('page')) || 1);
        return NextResponse.json({ configured: true, ...(await walletHistory({ page, limit: 25 })), page });
      }
      const [bal, hist] = await Promise.all([balance(), tradesHistory({ page: 1, limit: 100 })]);
      const shown = hist.trades.slice(0, 50);
      // CSGO-API nomi wear'siz va StatTrak'siz ("AK-47 | Redline") — market_hash_name'dan shuni ajratamiz
      const baseName = (n) => {
        const p = parseSkinName(n || '');
        return p ? `${p.weaponBase} | ${p.skinName}` : n;
      };
      const names = [...new Set(shown.map((t) => baseName(t.marketHashName || t.market_hash_name)).filter(Boolean))];
      const meta = names.length ? await getSkinMeta(names).catch(() => ({})) : {};
      const byStatus = {};
      for (const t of hist.trades) {
        const k = String(t.status).toUpperCase();
        byStatus[k] = (byStatus[k] || 0) + 1;
      }
      const by = (...st) => hist.trades.filter((t) => st.includes(String(t.status).toUpperCase())).length;
      return NextResponse.json({
        configured: true,
        ...bal,
        merchantId: process.env.CS2SHOP_MERCHANT_ID,
        skinsSource: (process.env.SKINS_SOURCE || 'skinport').toLowerCase(),
        fulfillProvider: activeProvider(),
        webhookUrl: `${SITE}/api/cs2shop/webhook`,
        counts: {
          active: by('PENDING', 'SENT'),
          completed: by('COMPLETED'),
          failed: by('FAILED', 'EXPIRED', 'CANCELLED', 'REVERSED'),
          sample: hist.trades.length,
          total: hist.total,
        },
        byStatus,
        trades: shown.map((t) => {
          const item = t.marketHashName || t.market_hash_name || null;
          const m = meta[baseName(item)] || {};
          return {
            tradeId: t.tradeId,
            externalRef: t.externalRef,
            status: t.status,
            item,
            priceUsd: t.priceUsd ?? t.price ?? null,
            updatedAt: t.updatedAt,
            createdAt: t.createdAt || null,
            completedAt: t.completedAt || null,
            cancelledAt: t.cancelledAt || null,
            failReason: t.failReason || null,
            errorCode: t.errorCode ?? null,
            webhookStatus: t.webhookStatus || null,
            offerId: t.offerId || null,
            partner: parseTradeUrl(t.tradeUrl || '')?.partner || null, // token ko'rsatilmaydi
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
  if (ref) {
    if (!/^TEST-[A-Za-z0-9-]{4,60}$/.test(ref)) return NextResponse.json({ error: 'bad_ref' }, { status: 400 });
    return NextResponse.json({ ref, ...(await status(ref)) });
  }

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

  if (body.action === 'webhook') {
    try {
      const r = await setWebhook(`${SITE}/api/cs2shop/webhook`);
      return NextResponse.json({ ok: true, ...r });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  // Telegram guruhga test xabar: guruh to'g'ri ulanganini tekshiradi (xato sababi bilan)
  if (body.action === 'test_alert') {
    const r = await sendCs2shop('✅ OXY SAVDO: cs2shop guruhi ulandi. Bu test xabar.');
    return NextResponse.json({ ...r, chatConfigured: Boolean(cs2shopChatId()) }, { status: r.ok ? 200 : 502 });
  }

  // Balansni hozir tekshirish; kam bo'lsa guruhga ogohlantirish yuboradi (takrorlanmaslik qoidasiz)
  if (body.action === 'check_balance') {
    try {
      return NextResponse.json({ ok: true, ...(await checkLowBalance({ force: true })) });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  if (body.action === 'test_buy') {
    const tradeUrl = String(body.tradeUrl || '').trim();
    if (!parseTradeUrl(tradeUrl)) return NextResponse.json({ ok: false, error: "Trade URL noto'g'ri" }, { status: 400 });
    const maxUsd = Math.min(TEST_MAX_USD, Math.max(0.3, Number(body.maxUsd) || TEST_MAX_USD));

    try {
      const bal = await balance();
      const listings = await fetchListings();
      const now = Date.now();
      const pick = listings
        .filter(
          (l) =>
            l.market_hash_name?.includes(' | ') &&
            Number(l.price) > 0 &&
            Number(l.price) <= maxUsd &&
            (!l.availableAfter || Date.parse(l.availableAfter) <= now) &&
            (!l.tradableAt || Date.parse(l.tradableAt) <= now)
        )
        .sort((a, b) => a.price - b.price)[0];
      if (!pick) return NextResponse.json({ ok: false, error: `$${maxUsd} gacha mos skin topilmadi` }, { status: 404 });
      if (bal.available < pick.price) {
        return NextResponse.json({ ok: false, error: `cs2shop balansi yetarli emas ($${bal.available} < $${pick.price})` }, { status: 400 });
      }

      const ref = `TEST-${Date.now().toString(36).toUpperCase()}`;
      const r = await buy({
        marketHashName: pick.market_hash_name,
        listingId: pick.listingId,
        maxPriceUSD: maxUsd,
        salePriceUSD: maxUsd + 0.5, // adapter: limit = sotuv narxi - $0.5 marja = maxUsd
        tradeUrl,
        customId: ref,
      });
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
      // guruhga ham xabar: test savdo yuborilganini ko'rish uchun (keyingi holatlar webhook orqali keladi)
      const tg = await sendCs2shop(
        `🧪 cs2shop test savdo ${ref}\n${pick.market_hash_name} · $${pick.price}\nHolat: ${r.state || 'processing'} (offer yuborildi, Steam'da qabul qiling)`
      );
      return NextResponse.json({
        ok: true,
        notified: tg.ok,
        notifyError: tg.ok ? undefined : tg.error,
        ref,
        item: pick.market_hash_name,
        priceUsd: pick.price,
        float: pick.floatValue ?? null,
        state: r.state,
        detail: r.detail || null,
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
