'use client';

import { useEffect, useState } from 'react';
import { X } from './icons';

// 3D ko'rgich: CS2 Inspects (3dview.cs2inspects.com) iframe'i — skinni o'yindagidek 3D'da ko'rsatadi
// (float, naqsh, stikerlar bo'yicha). Faqat inspect havola (steam://...) kerak. LIS-SKINS ham shuni ishlatadi.
const VIEWER = 'https://3dview.cs2inspects.com/';

export default function Skin3DModal({ inspectLink, title, closeLabel = 'Yopish', loadingLabel = 'Yuklanmoqda…', onClose }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const src = `${VIEWER}?inspectlink=${encodeURIComponent(inspectLink)}`;

  return (
    <div data-3d-open className="fixed inset-0 z-[120] grid place-items-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title || '3D'}>
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden border border-line bg-panel shadow-[0_20px_80px_rgba(0,0,0,0.7)] sm:h-[min(85vh,760px)] sm:rounded-2xl">
        <div className="flex flex-none items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 truncate text-sm font-semibold">{title || '3D'}</div>
          <div className="flex flex-none items-center gap-3">
            <span className="hidden text-[11px] text-muted sm:inline">3D: CS2 Inspects</span>
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
