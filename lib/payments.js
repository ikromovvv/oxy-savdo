// To'lov provayderi abstraktsiyasi.
//
// .env.local:
//   PAYMENT_PROVIDER = manual | test | payme | click
//   PAYMENT_RETURN_URL_BASE = https://sizning-domen.uz   (ixtiyoriy; bo'lmasa so'rov origin'i)
//
//   payme:  PAYME_MERCHANT_ID, PAYME_KEY   (test yoki prod kalit — Payme kabinetidan)
//   click:  CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY, CLICK_MERCHANT_USER_ID
//
// 'manual' (birlamchi) — hech qanday kalit kerak emas: buyurtma 'new' bo'lib
// qoladi, operator admin panelda "To'landi" deb belgilaydi.
// 'test' — soxta to'lov sahifasi, darhol "paid" qiladi (faqat ishlab chiqishda).

import { paymeCheckoutUrl } from './pay/payme';
import { clickCheckoutUrl } from './pay/click';

export function activeProvider() {
  const p = (process.env.PAYMENT_PROVIDER || 'manual').toLowerCase();
  return ['manual', 'test', 'payme', 'click'].includes(p) ? p : 'manual';
}

export function paymentConfigured() {
  const p = activeProvider();
  if (p === 'payme') return Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);
  if (p === 'click') {
    return Boolean(
      process.env.CLICK_SERVICE_ID &&
        process.env.CLICK_MERCHANT_ID &&
        process.env.CLICK_SECRET_KEY
    );
  }
  return p === 'test'; // manual — sozlanmagan holat
}

function returnBase(origin) {
  return (process.env.PAYMENT_RETURN_URL_BASE || origin || '').replace(/\/+$/, '');
}

function isConfigured(p) {
  if (p === 'payme') return Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);
  if (p === 'click') {
    return Boolean(
      process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY
    );
  }
  return false;
}

// Xaridor tanlay oladigan onlayn to'lov usullari (kalitlari sozlanganlari).
// Payme ham, Click ham sozlangan bo'lsa — ikkalasi ham ko'rinadi. 'test' faqat
// PAYMENT_PROVIDER=test (ishlab chiqish) bo'lganda.
export function availableProviders() {
  const list = ['payme', 'click'].filter(isConfigured);
  if (!list.length && activeProvider() === 'test') return ['test'];
  return list;
}

// Buyurtma yaratilgandan keyin chaqiriladi.
// wanted — ixtiyoriy: aynan shu provayder (availableProviders ichidan) bilan to'lash.
// -> { provider, payUrl } yoki { provider: 'manual', payUrl: null }
export function createPayment(order, origin, wanted) {
  const provider = wanted && availableProviders().includes(wanted) ? wanted : activeProvider();
  const base = returnBase(origin);
  const returnUrl = base ? `${base}/tolov/${order.ref}` : `/tolov/${order.ref}`;

  if (provider === 'test') {
    return { provider, payUrl: `${base || ''}/tolov/${order.ref}?test=1` };
  }
  if (provider === 'payme' && isConfigured('payme')) {
    return { provider, payUrl: paymeCheckoutUrl(order, returnUrl) };
  }
  if (provider === 'click' && isConfigured('click')) {
    return { provider, payUrl: clickCheckoutUrl(order, returnUrl) };
  }
  return { provider: 'manual', payUrl: null };
}
