// Admin: LIS katalogidan skinni QO'LDA sotib olib, ko'rsatilgan trade-linkka yuborish
// (masalan, admin skinni mijozga boshqa kanal orqali sotgan bo'lsa).
//
// Oqim: nom bo'yicha qulfsiz eng arzon nusxa topiladi -> narx katalogdagi narxdan 5% dan ko'p oshmasa
// sotib olinadi (max_price himoyasi) -> LIS boti trade offer yuboradi.
// Himoya: narx chegarasi (LIS_ADMIN_BUY_MAX_USD, birlamchi $3000), balans tekshiruvi, takroriy xarid yo'q (custom_id).

import * as lis from './fulfill/lis';
import { parseTradeUrl } from './steamTrade';

export const adminBuyMaxUsd = () => {
  const v = Number(process.env.LIS_ADMIN_BUY_MAX_USD);
  return Number.isFinite(v) && v > 0 ? v : 3000;
};

const PRICE_TOLERANCE = 1.05; // katalog narxi eskirgan bo'lishi mumkin — 5% gacha qabul
const round2 = (n) => Math.round(n * 100) / 100;

// -> { ok:true, ref, item, priceUsd, float, state, detail } | { ok:false, status, error }
export async function adminBuy({ name, tradeUrl, expectedUsd }) {
  const trade = parseTradeUrl(String(tradeUrl || '').trim());
  if (!trade) return { ok: false, status: 400, error: "Trade URL noto'g'ri" };
  const marketHashName = String(name || '').trim();
  if (!marketHashName) return { ok: false, status: 400, error: 'Skin nomi yo\'q' };
  const expected = Number(expectedUsd);
  if (!(expected > 0)) return { ok: false, status: 400, error: 'Narx noaniq' };
  if (expected > adminBuyMaxUsd()) {
    return { ok: false, status: 400, error: `Narx chegaradan oshdi ($${expected} > $${adminBuyMaxUsd()}). Chegara: LIS_ADMIN_BUY_MAX_USD` };
  }

  const cap = round2(expected * PRICE_TOLERANCE);
  const bal = await lis.balance();
  const found = (await lis.searchSkins({ name: marketHashName, onlyUnlocked: true }))
    .filter((s) => !s.unlock_at && Number(s.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price));

  if (!found.length) return { ok: false, status: 404, error: `"${marketHashName}" qulfsiz holatda mavjud emas` };
  const cands = found
    .filter((s) => Number(s.price) <= cap)
    // tez yetkaziladigan nusxa birinchi (delivery_type=1), keyin narx bo'yicha
    .sort((a, b) => (Number(a.delivery_type) === 1 ? 0 : 1) - (Number(b.delivery_type) === 1 ? 0 : 1) || Number(a.price) - Number(b.price))
    .slice(0, 6);
  if (!cands.length) {
    return { ok: false, status: 409, error: `Narx oshib ketdi: eng arzoni $${Number(found[0].price).toFixed(2)} (limit $${cap.toFixed(2)}). Katalogni yangilang` };
  }

  // Arzon skinlar tez sotilib ketadi (skins_unavailable) — keyingi nusxaga o'tamiz
  const ref = `ADM-${Date.now().toString(36).toUpperCase()}`;
  let pick = null;
  let r = null;
  let lastErr = '';
  for (const cand of cands) {
    if (bal.available < Number(cand.price)) {
      lastErr = `LIS balansi yetarli emas ($${bal.available.toFixed(2)} < $${Number(cand.price).toFixed(2)})`;
      break;
    }
    const res = await lis.buy({
      marketHashName,
      listingId: cand.id,
      maxPriceUSD: cap,
      salePriceUSD: cap + 0.5,
      partner: trade.partner,
      token: trade.token,
      customId: ref,
    });
    if (res.ok) {
      pick = cand;
      r = res;
      break;
    }
    lastErr = res.error;
    if (!/unavailable|not_found|already|sold/i.test(String(res.error || ''))) break;
  }
  if (!r) {
    const gone = /unavailable/i.test(lastErr);
    return {
      ok: false,
      status: gone ? 409 : 502,
      error: gone ? `Bu skin hozirgina sotilib ketdi (${lastErr}). Katalogni yangilab, qayta urinib ko'ring` : lastErr,
    };
  }

  return {
    ok: true,
    ref: r.providerRef || ref,
    item: marketHashName,
    priceUsd: Number(pick.price),
    float: pick.item_float != null && pick.item_float !== '' ? Number(pick.item_float) : null,
    partner: trade.partner,
    state: r.state,
    detail: r.detail || null,
  };
}
