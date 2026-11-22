// So'rov doirasidagi LIS API kaliti: har admin o'z LIS akkaunti (kaliti, balansi) bilan ishlaydi.
// Admin route'lari handler'ni runWithLisKey(admin.lisKey, ...) ichida ishga tushiradi;
// lib/fulfill/lis.js kalitni shu yerdan oladi. Kontekst bo'lmasa (mijoz buyurtmalari, cron) — LIS_SKINS_API_KEY.

import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

export function runWithLisKey(key, fn) {
  return als.run({ key: String(key || '') }, fn);
}

// undefined — kontekst yo'q (env kaliti ishlatiladi); '' — adminning LIS kaliti kiritilmagan
export function lisKeyFromContext() {
  const s = als.getStore();
  return s ? s.key : undefined;
}
