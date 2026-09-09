// Click (CLICK Merchant API / SHOP API).
// Hujjat: https://docs.click.uz
//
// To'lov linki -> my.click.uz/services/pay
// Click ikkita callback yuboradi (POST, form-urlencoded):
//   /api/pay/click/prepare   (action=0)
//   /api/pay/click/complete  (action=1)
// Imzo: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
//           [+ merchant_prepare_id (complete)] + amount + action + sign_time)
//
// merchant_trans_id = bizning buyurtma `ref`.

import crypto from 'crypto';
import { getOrder, setPayment, markOrderPaid } from '../orderStore';
import { maybeAutoFulfill } from '../fulfillment';

const ERR = {
  OK: 0,
  SIGN: -1,
  AMOUNT: -2,
  ACTION: -3,
  ALREADY_PAID: -4,
  NOT_FOUND: -5,
  CANCELLED: -9,
};

export function clickCheckoutUrl(order, returnUrl) {
  const params = new URLSearchParams({
    service_id: process.env.CLICK_SERVICE_ID || '',
    merchant_id: process.env.CLICK_MERCHANT_ID || '',
    amount: String(order.total || 0),
    transaction_param: order.ref,
  });
  if (returnUrl) params.set('return_url', returnUrl);
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function verifySign(p, withPrepareId) {
  const secret = process.env.CLICK_SECRET_KEY || '';
  const base =
    String(p.click_trans_id) +
    String(p.service_id) +
    secret +
    String(p.merchant_trans_id) +
    (withPrepareId ? String(p.merchant_prepare_id) : '') +
    String(p.amount) +
    String(p.action) +
    String(p.sign_time);
  return md5(base) === String(p.sign_string || '').toLowerCase();
}

function resp(p, error, extra = {}) {
  return {
    click_trans_id: p.click_trans_id,
    merchant_trans_id: p.merchant_trans_id,
    error,
    error_note: error === 0 ? 'Success' : 'Error',
    ...extra,
  };
}

// action=0 — to'lovni tayyorlash
export async function handleClickPrepare(p) {
  if (!verifySign(p, false)) return resp(p, ERR.SIGN);

  const order = await getOrder(String(p.merchant_trans_id));
  if (!order) return resp(p, ERR.NOT_FOUND);
  if (['cancelled', 'refunded'].includes(order.status)) return resp(p, ERR.CANCELLED);
  if (order.payment?.status === 'paid') return resp(p, ERR.ALREADY_PAID);
  if (Math.round(Number(p.amount)) !== Math.round(order.total || 0)) return resp(p, ERR.AMOUNT);

  await setPayment(order.id, {
    provider: 'click',
    status: 'pending',
    providerTxnId: String(p.click_trans_id),
    createTime: Date.now(),
  });

  // merchant_prepare_id sifatida buyurtma ref'ini ishlatamiz
  return resp(p, ERR.OK, { merchant_prepare_id: order.ref });
}

// action=1 — to'lovni yakunlash
export async function handleClickComplete(p) {
  if (!verifySign(p, true)) return resp(p, ERR.SIGN);

  const order = await getOrder(String(p.merchant_trans_id));
  if (!order) return resp(p, ERR.NOT_FOUND);
  if (String(p.merchant_prepare_id) !== String(order.ref)) return resp(p, ERR.NOT_FOUND);
  if (Math.round(Number(p.amount)) !== Math.round(order.total || 0)) return resp(p, ERR.AMOUNT);

  // Click bekor qilganda error < 0 yuboradi
  if (Number(p.error) < 0) {
    await setPayment(order.id, { status: 'failed', cancelTime: Date.now(), reason: p.error_note || null });
    return resp(p, ERR.OK, { merchant_confirm_id: order.ref });
  }

  if (order.payment?.status !== 'paid') {
    const res = await markOrderPaid(order.id, {
      provider: 'click',
      providerTxnId: String(p.click_trans_id),
      performTime: Date.now(),
      amount: Number(p.amount),
      by: 'click',
    });
    if (!res?.duplicate) maybeAutoFulfill(order.id).catch(() => {});
  }
  return resp(p, ERR.OK, { merchant_confirm_id: order.ref });
}
