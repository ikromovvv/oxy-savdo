'use client';

import { useEffect } from 'react';

// Sahifa ichidagi kutilmagan brauzer xatosi (client-side exception) uchun chiroyli oyna + avtomatik tiklanish.
// Eng ko'p sabab: yangi deploy paytida eski JS bo'laklari (chunk) o'chib ketadi (ChunkLoadError) —
// bunda sahifani bir marta o'zi qayta yuklaydi (cheksiz aylanmasligi uchun sessiyada belgilab qo'yiladi).
const KEY = 'oxy:chunk-reload';

export default function Error({ error, reset }) {
  const msg = String(error?.message || '');
  const isChunk = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    `${error?.name || ''} ${msg}`
  );

  useEffect(() => {
    if (!isChunk) return;
    try {
      if (sessionStorage.getItem(KEY) === '1') return;
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* sessionStorage yo'q — baribir bir marta urinib ko'ramiz */
    }
    window.location.reload();
  }, [isChunk]);

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="label">OXY SAVDO</div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sahifani yuklab bo&apos;lmadi</h1>
      <p className="mt-2 text-sm text-muted">
        Vaqtinchalik xatolik yuz berdi. Sahifani qayta yuklang — odatda bu muammoni hal qiladi.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={() => window.location.reload()} className="btn-primary">
          Qayta yuklash
        </button>
        <button onClick={() => reset()} className="btn-ghost">
          Qayta urinish
        </button>
      </div>
    </section>
  );
}
