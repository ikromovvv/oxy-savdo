'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2 } from './icons';

// 3D ko'rgich: CS2 Inspects (3dview.cs2inspects.com) iframe'i — skinni o'yindagidek 3D'da ko'rsatadi
// (float, naqsh, stikerlar bo'yicha). Faqat inspect havola (steam://...) kerak. LIS-SKINS ham shuni ishlatadi.
// "Kattalashtirish" tugmasi: oyna butun ekranga (100% x 100%) yoyiladi va brauzer to'liq ekran rejimiga (F11 kabi) o'tadi.
const VIEWER = 'https://3dview.cs2inspects.com/';

export default function Skin3DModal({
  inspectLink,
  title,
  closeLabel = 'Yopish',
  loadingLabel = 'Yuklanmoqda…',
  fullLabel = 'To\'liq ekran',
  exitFullLabel = 'Kichraytirish',
  onClose,
}) {
  const [loaded, setLoaded] = useState(false);
  const [full, setFull] = useState(false);
  const rootRef = useRef(null);
  const fullRef = useRef(false);
  fullRef.current = full;

  const toggleFull = () => {
    const next = !fullRef.current;
    setFull(next);
    try {
      if (next) rootRef.current?.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch {
      /* brauzer to'liq ekranga ruxsat bermasa — faqat oyna kattalashadi */
    }
  };

  useEffect(() => {
    // Esc: avval to'liq ekrandan chiqadi, keyin oynani yopadi
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (fullRef.current) setFull(false);
      else onClose();
    };
    // brauzer o'zi to'liq ekrandan chiqsa (Esc/F11) — holatni moslaymiz
    const onFs = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      document.body.style.overflow = prev;
      try {
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      } catch {
        /* e'tiborsiz */
      }
    };
  }, [onClose]);

  const src = `${VIEWER}?inspectlink=${encodeURIComponent(inspectLink)}`;

  return (
    <div
      ref={rootRef}
      data-3d-open
      className={`fixed inset-0 z-[120] grid place-items-center ${full ? 'p-0' : 'p-0 sm:p-6'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || '3D'}
    >
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className={`relative flex flex-col overflow-hidden bg-panel shadow-[0_20px_80px_rgba(0,0,0,0.7)] ${
          full ? 'h-full w-full max-w-none rounded-none border-0' : 'h-full w-full max-w-6xl border border-line sm:h-[min(85vh,760px)] sm:rounded-2xl'
        }`}
      >
        <div className="flex flex-none items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 truncate text-sm font-semibold">{title || '3D'}</div>
          <div className="flex flex-none items-center gap-2">
            <span className="mr-1 hidden text-[11px] text-muted sm:inline">3D: CS2 Inspects</span>
            <button
              onClick={toggleFull}
              aria-label={full ? exitFullLabel : fullLabel}
              title={full ? exitFullLabel : fullLabel}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-white"
            >
              {full ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
            </button>
            <button onClick={onClose} aria-label={closeLabel} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 bg-black">
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                {loadingLabel}
              </div>
            </div>
          )}
          <iframe
            src={src}
            title={title || '3D'}
            onLoad={() => setLoaded(true)}
            allow="fullscreen; clipboard-write; pointer-lock"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
