// Avtomatik yetkazish orkestratori (4-bosqich).
//
// .env.local:
//   FULFILL_PROVIDER = manual | test | skinsback | waxpeer
//   USD_UZS = 12700            (skin narxini USD -> so'm konvertatsiya kursi)
//   FULFILL_CRON_SECRET = ...  (/api/fulfill/run ni himoyalash uchun)
//
// 'manual' (birlamchi) — hech narsa qilmaydi, operator admin panelda qo'lda
// "Yuborildi" bosadi. Boshqa provayderlar sozlansa — buyurtma 'paid'
// bo'lganda skinlar avtomatik sotib olinib xaridorga trade qilinadi.

import { parseTradeUrl } from './steamTrade';
import { getOrder, setFulfillment, updateOrder, listOrders, notifyTelegram } from './orderStore';
import * as test from './fulfill/test';
import * as skinsback from './fulfill/skinsback';
import * as waxpeer from './fulfill/waxpeer';

const ADAPTERS = { test, skinsback, waxpeer };
const USD_UZS = Number(process.env.USD_UZS) || 12700;
const PRICE_TOLERANCE = 1.03; // provayder narxi 3% oshsa ham ruxsat

// ---- retry (qayta urinish) siyosati ----
const MAX_RETRIES = Math.max(1, Number(process.env.FULFILL_MAX_RETRIES) || 5);
const RETRY_BASE_MS = 5 * 60 * 1000; // 5 daqiqa
const RETRY_CAP_MS = 6 * 60 * 60 * 1000; // 6 soat

// eksponensial backoff: 5m, 10m, 20m, 40m, ... (6 soatgacha)
function nextRetryDelay(attempts) {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_CAP_MS);
}

// Xatoli fulfillment hozir qayta urinishga tayyormi?
//  -> { ready:true } | { ready:false, reason }
function retryGate(order) {
  const f = order.fulfillment || {};
  if (f.status !== 'error') return { ready: true };
  if (f.exhausted || (f.attempts || 0) >= MAX_RETRIES) {
    return { ready: false, reason: 'max_retries' };
  }
  if (f.nextRetryAt && Date.now() < f.nextRetryAt) {
    return { ready: false, reason: 'retry_backoff' };
  }
  return { ready: true };
}

export function activeProvider() {
  const p = (process.env.FULFILL_PROVIDER || 'manual').toLowerCase();
  return ['manual', 'test', 'skinsback', 'waxpeer'].includes(p) ? p : 'manual';
}

export function fulfillmentConfigured() {
  const p = activeProvider();
  if (p === 'manual') return false;
  if (p === 'test') return true;
  return Boolean(ADAPTERS[p]?.configured?.());
}

function skinItems(order) {
  return (order.items || []).filter((it) => it.kind === 'skin');
}

// paid buyurtmani yetkazishga topshiradi
export async function fulfillOrder(idOrRef) {
  const order = await getOrder(idOrRef);
  if (!order) return { error: 'Topilmadi' };

  const provider = activeProvider();
  const skins = skinItems(order);
  if (skins.length === 0) return { skip: 'no_skins' };
  if (provider === 'manual' || !fulfillmentConfigured()) return { skip: 'manual' };
  if (!order.tradeUrl) return { error: "Trade URL yo'q" };
  if (!['paid', 'fulfilling'].includes(order.status)) return { skip: 'wrong_status' };
  if (['processing', 'sent'].includes(order.fulfillment?.status)) return { skip: 'already' };

  const gate = retryGate(order);
  if (!gate.ready) return { skip: gate.reason };

  const adapter = ADAPTERS[provider];
  const trade = parseTradeUrl(order.tradeUrl);
  const attempts = (order.fulfillment?.attempts || 0) + 1;

  await updateOrder(order.id, {
    status: 'fulfilling',
    by: 'system',
    note:
      attempts > 1
        ? `Avtomatik yetkazish — qayta urinish #${attempts}`
        : 'Avtomatik yetkazish boshlandi',
  });
  await setFulfillment(order.id, {
    provider,
    status: 'processing',
    startedAt: order.fulfillment?.startedAt || Date.now(),
    attempts,
    lastAttemptAt: Date.now(),
    error: null,
  });

  const results = [];
  for (const it of skins) {
    for (let n = 0; n < it.qty; n++) {
      const maxPriceUSD = ((it.price / USD_UZS) * PRICE_TOLERANCE).toFixed(2);
      let r;
      try {
        r = await adapter.buy({
          marketHashName: it.marketHashName || it.name,
          maxPriceUSD,
          tradeUrl: order.tradeUrl,
          partner: trade?.partner,
          token: trade?.token,
          customId: `${order.ref}-${it.id}-${n}`,
        });
      } catch (e) {
        r = { ok: false, error: e.message, state: 'error' };
      }
      results.push({
        id: it.id,
        marketHashName: it.marketHashName || it.name,
        providerRef: r.providerRef || null,
        state: r.ok ? r.state || 'processing' : 'error',
        error: r.ok ? null : r.error || 'xato',
        detail: r.detail || null,
      });
    }
  }

  return finalize(order.id, results);
}

// fulfilling buyurtmani provayderdan poll qilib ilgarilatadi
export async function pollFulfillment(idOrRef) {
  const order = await getOrder(idOrRef);
  if (!order) return { error: 'Topilmadi' };
  const provider = order.fulfillment?.provider;
  if (!provider || !ADAPTERS[provider]) return { skip: 'no_provider' };
  if (!['fulfilling', 'sent'].includes(order.status)) return { skip: 'wrong_status' };

  const adapter = ADAPTERS[provider];
  const items = order.fulfillment.items || [];
  const updated = [];
  for (const it of items) {
    if (it.state === 'done' || it.state === 'error' || !it.providerRef) {
      updated.push(it);
      continue;
    }
    let s;
    try {
      s = await adapter.status(it.providerRef);
    } catch (e) {
      s = { state: it.state, error: e.message };
    }
    updated.push({
      ...it,
      state: s.state || it.state,
      detail: s.detail || it.detail,
      error: s.error || it.error,
    });
  }

  return finalize(order.id, updated, { poll: true });
}

async function finalize(orderId, results, { poll = false } = {}) {
  const anyError = results.some((r) => r.state === 'error');
  const allDone = results.length > 0 && results.every((r) => r.state === 'done');
  const allSent = results.length > 0 && results.every((r) => r.state === 'sent' || r.state === 'done');

  if (anyError) {
    const order = await getOrder(orderId);
    const attempts = order?.fulfillment?.attempts || 1;
    const exhausted = attempts >= MAX_RETRIES;
    const errMsg = results.find((r) => r.error)?.error || 'Yetkazishda xato';

    await setFulfillment(orderId, {
      items: results,
      status: 'error',
      error: errMsg,
      lastError: errMsg,
      lastAttemptAt: Date.now(),
      nextRetryAt: exhausted ? null : Date.now() + nextRetryDelay(attempts),
      exhausted,
    });
    await updateOrder(orderId, {
      status: 'paid',
      by: 'system',
      note: exhausted
        ? `Avtomatik yetkazish ${MAX_RETRIES} marta muvaffaqiyatsiz — qo'lda hal qiling`
        : `Avtomatik yetkazishda xato (urinish #${attempts}) — qayta urinamiz`,
    });

    notifyTelegram(
      `⚠️ Yetkazish xatosi — ${order?.ref || orderId}\n` +
        `Urinish: #${attempts}${exhausted ? ` (limit — ${MAX_RETRIES})` : ''}\n` +
        `Xato: ${errMsg}` +
        (exhausted ? '\n❗️ Qo\'lda aralashuv kerak' : '')
    ).catch(() => {});

    return { error: errMsg, results, attempts, exhausted };
  }

  await setFulfillment(orderId, {
    items: results,
    status: allDone ? 'done' : allSent ? 'sent' : 'processing',
    error: null,
    lastError: null,
    nextRetryAt: null,
  });
  if (allDone) {
    await updateOrder(orderId, { status: 'done', by: 'system', note: 'Yetkazildi (avtomatik)' });
  } else if (allSent) {
    await updateOrder(orderId, {
      status: 'sent',
      by: 'system',
      note: 'Trade offer yuborildi (avtomatik)',
    });
  }
  return { ok: true, results, poll };
}

// to'lovdan keyin best-effort chaqiriladi (route handlerlardan)
export async function maybeAutoFulfill(idOrRef) {
  try {
    if (activeProvider() === 'manual' || !fulfillmentConfigured()) return;
    await fulfillOrder(idOrRef);
  } catch (e) {
    console.error('[fulfillment] maybeAutoFulfill:', e.message);
  }
}

// cron: barcha kutilayotgan buyurtmalarni bir marta aylanadi
export async function runFulfillmentTick() {
  const summary = { fulfilled: 0, polled: 0, errors: 0, skipped: 0 };
  if (activeProvider() === 'manual') return { ...summary, note: 'provider=manual' };

  const paid = await listOrders({ status: 'paid' });
  summary.waitingRetry = 0;
  summary.exhausted = 0;
  for (const o of paid) {
    const r = await fulfillOrder(o.id).catch((e) => ({ error: e.message }));
    if (r.ok) summary.fulfilled++;
    else if (r.error) summary.errors++;
    else {
      summary.skipped++;
      if (r.skip === 'retry_backoff') summary.waitingRetry++;
      if (r.skip === 'max_retries') summary.exhausted++;
    }
  }

  const inflight = await listOrders({ statuses: ['fulfilling', 'sent'] });
  for (const o of inflight) {
    const r = await pollFulfillment(o.id).catch((e) => ({ error: e.message }));
    if (r.ok) summary.polled++;
    else if (r.error) summary.errors++;
    else summary.skipped++;
  }
  return summary;
}
