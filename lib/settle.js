// To'langan buyurtmadan keyingi ishlar (bitta joyda):
//   - balansni to'ldirish buyurtmasi  -> hamyonga kirim (idempotent)
//   - oddiy buyurtma                  -> avtomatik yetkazish (provayder bo'lsa)
//   - balansdan to'lash               -> payOrderWithWallet
//   - bekor / qaytarish               -> balansdan to'langan bo'lsa pulni qaytarish
//
// Hamma funksiya idempotent: payme/click takroriy callback yuborsa yoki cron
// qayta chaqirsa ham pul ikki marta qo'shilmaydi (wallet_txns UNIQUE key).
//
// DEMO PUL: demo to'lov sahifasi orqali to'ldirilgan summa HAQIQIY hamyonga emas,
// alohida "demo hamyon"ga (`demo:<steamid>`) tushadi. Undan to'langan buyurtma
// provider 'wallet-demo' bilan belgilanadi: avtomatik yetkazilmaydi va tushumga
// qo'shilmaydi. Shunda demo'ni hamma sinay oladi, lekin bepul haqiqiy skin olib bo'lmaydi.

import { getOrder, listOrders, updateOrder, markOrderPaid, notifyTelegram } from './orderStore';
import { creditWallet, debitWallet, getBalance } from './walletStore';
import { maybeAutoFulfill } from './fulfillment';

export const DEMO_PROVIDER = 'wallet-demo';
export const demoKey = (steamid) => `demo:${steamid}`;

export function isDepositOrder(order) {
  return Boolean(order?.items?.some((i) => i.kind === 'deposit'));
}
export function isDemoPaid(order) {
  return order?.payment?.provider === DEMO_PROVIDER;
}

// Header / savat uchun: haqiqiy va demo balans, hamda bitta buyurtmaga yetadigan summa
// (haqiqiy va demo pul aralashtirilmaydi).
export async function getWalletSummary(steamid) {
  const [real, demo] = await Promise.all([getBalance(steamid), getBalance(demoKey(steamid))]);
  return { real, demo, balance: real + demo, payable: Math.max(real, demo) };
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
    const demo = order.payment?.provider === 'demo';
    const c = await creditWallet({
      steamid: demo ? demoKey(steamid) : steamid,
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
        note: `${demo ? 'DEMO balans' : 'Balans'} to'ldirildi: ${Number(order.total).toLocaleString('ru-RU')} so'm`,
      });
      if (!demo) {
        notifyTelegram(`Balans to'ldirildi ${order.ref}: ${Number(order.total).toLocaleString('ru-RU')} so'm`).catch(() => {});
      }
    }
    return c;
  }

  // oddiy buyurtma: yetkazish (kutmaymiz — ichida o'z qo'riqchilari bor).
  // Demo pul bilan to'langan buyurtma fulfillOrder ichida o'zi rad etiladi.
  maybeAutoFulfill(order.id).catch(() => {});
  return { ok: true };
}

// Balansdan to'lash. Avval yechamiz (atomik), keyin buyurtmani "paid" qilamiz;
// ikkinchisi yiqilsa — pulni qaytaramiz. Skin hech qachon puldan oldin ketmaydi.
// Avval HAQIQIY balans, u yetmasa (butunlay) DEMO balans; ikkisi aralashtirilmaydi.
export async function payOrderWithWallet(order) {
  const steamid = order?.steam?.steamid;
  if (!steamid) return { ok: false, error: 'Balansdan to\'lash uchun Steam orqali kiring' };
  if (isDepositOrder(order)) return { ok: false, error: "Balansni balans bilan to'ldirib bo'lmaydi" };

  const { real, demo } = await getWalletSummary(steamid);
  const useDemo = real < order.total && demo >= order.total;
  const walletKey = useDemo ? demoKey(steamid) : steamid;

  const d = await debitWallet({
    steamid: walletKey,
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
      provider: useDemo ? DEMO_PROVIDER : 'wallet',
      providerTxnId: `wallet-${order.id}`,
      performTime: Date.now(),
      amount: order.total,
      by: 'wallet',
      note: useDemo ? "DEMO balansdan to'landi (haqiqiy pul emas)" : "Balansdan to'landi",
    });
    if (r?.error) throw new Error(r.error);
  } catch (e) {
    await creditWallet({
      steamid: walletKey,
      amount: order.total,
      kind: 'refund',
      ref: order.ref,
      key: `refund:${order.id}`,
      note: "to'lovni qayd etib bo'lmadi",
    }).catch(() => {});
    return { ok: false, error: "To'lovni qayd etib bo'lmadi, pul qaytarildi" };
  }

  settlePaidOrder(order.id).catch(() => {});
  return { ok: true, balance: d.balance, demo: useDemo };
}

// Admin buyurtmani bekor qilsa / qaytarsa va u balansdan to'langan bo'lsa —
// pul o'sha hamyonga (haqiqiy yoki demo) qaytadi (bir marta).
export async function refundWalletOrder(order) {
  const provider = order?.payment?.provider;
  if ((provider !== 'wallet' && provider !== DEMO_PROVIDER) || order?.payment?.status !== 'paid') {
    return { skip: true };
  }
  const steamid = order.steam?.steamid;
  return creditWallet({
    steamid: provider === DEMO_PROVIDER ? demoKey(steamid) : steamid,
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
