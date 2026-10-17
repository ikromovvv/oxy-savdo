// To'langan buyurtmadan keyingi ishlar (bitta joyda):
//   - balansni to'ldirish buyurtmasi  -> hamyonga kirim (idempotent)
//   - oddiy buyurtma                  -> avtomatik yetkazish (provayder bo'lsa)
//   - balansdan to'lash               -> payOrderWithWallet
//   - bekor / qaytarish               -> balansdan to'langan bo'lsa pulni qaytarish
//
// Hamma funksiya idempotent: payme/click takroriy callback yuborsa yoki cron
// qayta chaqirsa ham pul ikki marta qo'shilmaydi (wallet_txns UNIQUE key).

import { getOrder, listOrders, updateOrder, markOrderPaid, notifyTelegram } from './orderStore';
import { creditWallet, debitWallet } from './walletStore';
import { maybeAutoFulfill } from './fulfillment';

export function isDepositOrder(order) {
  return Boolean(order?.items?.some((i) => i.kind === 'deposit'));
}

// Hamyonga kirim — to'lov tasdiqlangandan keyin AWAIT qilinadi (callback
// javobidan oldin), shunda serverless funksiya tugab qolmaydi.
export async function settlePaidOrder(idOrRef) {
  const order = await getOrder(idOrRef);
  if (!order) return { error: 'Topilmadi' };
  if (order.payment?.status !== 'paid') return { skip: 'not_paid' };

  if (isDepositOrder(order)) {
    const steamid = order.steam?.steamid;
    if (!steamid) return { error: 'steamid_yoq' };
    const c = await creditWallet({
      steamid,
      amount: order.total,
      kind: 'deposit',
      ref: order.ref,
      key: `deposit:${order.id}`,
      note: order.payment?.provider ? `to'lov: ${order.payment.provider}` : null,
    });
    if (c.ok && !c.duplicate) {
      await updateOrder(order.id, {
        status: 'done',
        by: 'wallet',
        note: `Balans to'ldirildi: ${Number(order.total).toLocaleString('ru-RU')} so'm`,
      });
      notifyTelegram(`Balans to'ldirildi ${order.ref}: ${Number(order.total).toLocaleString('ru-RU')} so'm`).catch(() => {});
    }
    return c;
  }

  // oddiy buyurtma: yetkazish (kutmaymiz — ichida o'z qo'riqchilari bor)
  maybeAutoFulfill(order.id).catch(() => {});
  return { ok: true };
}

// Balansdan to'lash. Avval yechamiz (atomik), keyin buyurtmani "paid" qilamiz;
// ikkinchisi yiqilsa — pulni qaytaramiz. Skin hech qachon puldan oldin ketmaydi.
export async function payOrderWithWallet(order) {
  const steamid = order?.steam?.steamid;
  if (!steamid) return { ok: false, error: 'Balansdan to\'lash uchun Steam orqali kiring' };
  if (isDepositOrder(order)) return { ok: false, error: "Balansni balans bilan to'ldirib bo'lmaydi" };

  const d = await debitWallet({
    steamid,
    amount: order.total,
    kind: 'purchase',
    ref: order.ref,
    key: `purchase:${order.id}`,
    note: order.ref,
  });
  if (!d.ok) {
    return { ok: false, error: d.error === 'insufficient' ? 'Balans yetarli emas' : 'Balansdan yechib bo\'lmadi', balance: d.balance };
  }

  try {
    const r = await markOrderPaid(order.id, {
      provider: 'wallet',
      providerTxnId: `wallet-${order.id}`,
      performTime: Date.now(),
      amount: order.total,
      by: 'wallet',
      note: "Balansdan to'landi",
    });
    if (r?.error) throw new Error(r.error);
  } catch (e) {
    await creditWallet({
      steamid,
      amount: order.total,
      kind: 'refund',
      ref: order.ref,
      key: `refund:${order.id}`,
      note: "to'lovni qayd etib bo'lmadi",
    }).catch(() => {});
    return { ok: false, error: "To'lovni qayd etib bo'lmadi, pul qaytarildi" };
  }

  settlePaidOrder(order.id).catch(() => {});
  return { ok: true, balance: d.balance };
}

// Admin buyurtmani bekor qilsa / qaytarsa va u balansdan to'langan bo'lsa —
// pul hamyonga qaytadi (bir marta).
export async function refundWalletOrder(order) {
  if (!order || order.payment?.provider !== 'wallet' || order.payment?.status !== 'paid') {
    return { skip: true };
  }
  return creditWallet({
    steamid: order.steam?.steamid,
    amount: order.total,
    kind: 'refund',
    ref: order.ref,
    key: `refund:${order.id}`,
    note: 'buyurtma bekor qilindi / qaytarildi',
  });
}

// Cron: to'lov o'tgan, lekin hamyonga yozilmay qolgan to'ldirishlarni tuzatadi.
export async function recoverDeposits() {
  const paid = await listOrders({ status: 'paid' });
  let fixed = 0;
  for (const o of paid) {
    if (!isDepositOrder(o)) continue;
    const r = await settlePaidOrder(o.id).catch(() => null);
    if (r?.ok && !r.duplicate) fixed++;
  }
  return { fixed };
}
