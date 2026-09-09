// Payme (Paycom) Merchant API — JSON-RPC 2.0.
// Hujjat: https://developer.help.paycom.uz
//
// Bitta endpoint: POST /api/pay/payme
// Auth: Authorization: Basic base64("Paycom:" + PAYME_KEY)
// Summa TIYIN'da (so'm × 100). account.order_id = bizning buyurtma `ref`.

import { getOrder, setPayment, markOrderPaid } from '../orderStore';
import { maybeAutoFulfill } from '../fulfillment';

const ACCOUNT_FIELD = 'order_id';
const TXN_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 soat

// Payme xato kodlari
const E = {
  AUTH: { code: -32504, message: { uz: 'Ruxsat yo\'q', ru: 'Недостаточно привилегий', en: 'Insufficient privileges' } },
  METHOD: { code: -32601, message: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' } },
  PARSE: { code: -32700, message: { uz: 'Parse xato', ru: 'Ошибка парсинга', en: 'Parse error' } },
  AMOUNT: { code: -31001, message: { uz: 'Noto\'g\'ri summa', ru: 'Неверная сумма', en: 'Invalid amount' } },
  ACCOUNT: {
    code: -31050,
    message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
    data: ACCOUNT_FIELD,
  },
  TXN_NOT_FOUND: { code: -31003, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } },
  CANT_PERFORM: { code: -31008, message: { uz: 'Amalni bajarib bo\'lmaydi', ru: 'Невозможно выполнить операцию', en: 'Unable to perform operation' } },
  ALREADY: { code: -31099, message: { uz: 'Buyurtma allaqachon to\'langan', ru: 'Заказ уже оплачен', en: 'Order already paid' }, data: ACCOUNT_FIELD },
};

function rpcError(id, e) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code: e.code, message: e.message, data: e.data ?? null } };
}
function rpcOk(id, result) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function checkAuth(authHeader) {
  const key = process.env.PAYME_KEY || '';
  if (!key || !authHeader?.startsWith('Basic ')) return false;
  try {
    const [login, pass] = Buffer.from(authHeader.slice(6), 'base64').toString('utf8').split(':');
    return login === 'Paycom' && pass === key;
  } catch {
    return false;
  }
}

// checkout.paycom.uz linki (GET-forma variantidan sodda)
export function paymeCheckoutUrl(order, returnUrl) {
  const merchant = process.env.PAYME_MERCHANT_ID || '';
  const amountTiyin = Math.round((order.total || 0) * 100);
  const parts = [
    `m=${merchant}`,
    `ac.${ACCOUNT_FIELD}=${order.ref}`,
    `a=${amountTiyin}`,
    returnUrl ? `c=${returnUrl}` : null,
    'l=uz',
  ].filter(Boolean);
  const b64 = Buffer.from(parts.join(';'), 'utf8').toString('base64');
  return `https://checkout.paycom.uz/${b64}`;
}

async function findOrder(params) {
  const acc = params?.account || {};
  const ref = acc[ACCOUNT_FIELD];
  if (!ref) return null;
  return getOrder(String(ref));
}

// JSON-RPC so'rovni qayta ishlaydi. { authHeader, body } -> javob obyekti
export async function handlePayme({ authHeader, body }) {
  if (!checkAuth(authHeader)) return rpcError(body?.id, E.AUTH);

  const { method, params, id } = body || {};

  try {
    switch (method) {
      case 'CheckPerformTransaction': {
        const order = await findOrder(params);
        if (!order) return rpcError(id, E.ACCOUNT);
        if (Math.round((order.total || 0) * 100) !== Number(params.amount)) {
          return rpcError(id, E.AMOUNT);
        }
        if (order.payment?.status === 'paid') return rpcError(id, E.ALREADY);
        if (['cancelled', 'refunded'].includes(order.status)) return rpcError(id, E.CANT_PERFORM);
        return rpcOk(id, { allow: true });
      }

      case 'CreateTransaction': {
        const order = await findOrder(params);
        if (!order) return rpcError(id, E.ACCOUNT);
        if (Math.round((order.total || 0) * 100) !== Number(params.amount)) {
          return rpcError(id, E.AMOUNT);
        }
        const p = order.payment || {};

        // shu payme tranzaksiya allaqachon yaratilgan bo'lsa — qaytaramiz
        if (p.providerTxnId === params.id) {
          return rpcOk(id, {
            create_time: p.createTime || Date.now(),
            transaction: order.id,
            state: p.state || 1,
          });
        }
        // boshqa faol tranzaksiya bor bo'lsa
        if (p.providerTxnId && p.state === 1) return rpcError(id, E.CANT_PERFORM);
        if (p.status === 'paid') return rpcError(id, E.ALREADY);
        // vaqt tekshiruvi
        if (params.time && Date.now() - Number(params.time) > TXN_TIMEOUT_MS) {
          return rpcError(id, E.CANT_PERFORM);
        }

        const now = Date.now();
        await setPayment(order.id, {
          provider: 'payme',
          status: 'pending',
          providerTxnId: params.id,
          state: 1,
          createTime: now,
        });
        return rpcOk(id, { create_time: now, transaction: order.id, state: 1 });
      }

      case 'PerformTransaction': {
        const order = await orderByTxn(params.id);
        if (!order) return rpcError(id, E.TXN_NOT_FOUND);
        const p = order.payment || {};
        if (p.status === 'paid') {
          return rpcOk(id, {
            transaction: order.id,
            perform_time: p.performTime,
            state: 2,
          });
        }
        if (p.state !== 1) return rpcError(id, E.CANT_PERFORM);
        const now = Date.now();
        const res = await markOrderPaid(order.id, {
          provider: 'payme',
          providerTxnId: params.id,
          state: 2,
          performTime: now,
          amount: Number(params.amount) / 100,
          by: 'payme',
        });
        const updated = res?.order;
        if (!res?.duplicate) maybeAutoFulfill(order.id).catch(() => {});
        return rpcOk(id, {
          transaction: (updated || order).id,
          perform_time: updated?.payment?.performTime || now,
          state: 2,
        });
      }

      case 'CancelTransaction': {
        const order = await orderByTxn(params.id);
        if (!order) return rpcError(id, E.TXN_NOT_FOUND);
        const p = order.payment || {};
        const now = p.cancelTime || Date.now();
        const state = p.status === 'paid' ? -2 : -1;
        await setPayment(order.id, {
          status: 'failed',
          state,
          cancelTime: now,
          reason: params.reason ?? null,
        });
        return rpcOk(id, { transaction: order.id, cancel_time: now, state });
      }

      case 'CheckTransaction': {
        const order = await orderByTxn(params.id);
        if (!order) return rpcError(id, E.TXN_NOT_FOUND);
        const p = order.payment || {};
        return rpcOk(id, {
          create_time: p.createTime || 0,
          perform_time: p.performTime || 0,
          cancel_time: p.cancelTime || 0,
          transaction: order.id,
          state: p.state || 0,
          reason: p.reason ?? null,
        });
      }

      case 'GetStatement':
        return rpcOk(id, { transactions: [] });

      default:
        return rpcError(id, E.METHOD);
    }
  } catch (err) {
    console.error('[payme] xato:', err?.message || err);
    return rpcError(id, E.CANT_PERFORM);
  }
}

// payme txn id bo'yicha buyurtmani topish
async function orderByTxn(txnId) {
  const { listOrders } = await import('../orderStore');
  const all = await listOrders();
  return all.find((o) => o.payment?.providerTxnId === txnId) || null;
}
