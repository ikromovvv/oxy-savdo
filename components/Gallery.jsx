'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ProductMedia } from './ProductCard';

/**
 * Mahsulot rasm galereyasi.
 */
export default function Gallery({ product }) {
  const list = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);
  const [i, setI] = useState(0);

  const boxRef = useRef(null);      // asosiy rasm joyi
  const mainRef = useRef(null);     // asosiy rasm (ichki div)
  const thumbsRef = useRef(null);
  const first = useRef(true);
  const drag = useRef({ active: false, startX: 0, dx: 0, pointerId: null });

  // ---- rasm almashganda fade ----
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!mainRef.current) return;
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, scale: 1.03 },
      { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out', clearProps: 'all' }
    );
  }, [i]);

  // ---- klaviatura: ← → ----
  useEffect(() => {
    if (list.length < 2) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + list.length) % list.length);
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % list.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list.length]);

  // ---- surib (drag/swipe) rasm almashtirish ----
  const goNext = () => setI((v) => (v + 1) % list.length);
  const goPrev = () => setI((v) => (v - 1 + list.length) % list.length);

  const onPointerDown = (e) => {
    if (list.length < 2) return;
    if (e.target.closest('button')) return; // oldingi/keyingi tugmalari bilan to'qnashmasin
    drag.current = { active: true, startX: e.clientX, dx: 0, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.dx = dx;
    if (mainRef.current) {
      gsap.set(mainRef.current, { x: dx * 0.35 });
    }
  };

  const endDrag = (e) => {
    if (!drag.current.active) return;
    const dx = drag.current.dx;
    drag.current.active = false;
    if (mainRef.current) {
      gsap.to(mainRef.current, { x: 0, duration: 0.3, ease: 'power2.out' });
    }
    const threshold = 60;
    if (dx <= -threshold) {
      goNext();
    } else if (dx >= threshold) {
      goPrev();
    }
    drag.current.dx = 0;
    if (e && e.pointerId != null && e.currentTarget?.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={boxRef}
        className={`relative touch-pan-y select-none ${list.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <ProductMedia
          product={product}
          src={list[i]}
          innerRef={mainRef}
          className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line"
        />

        {list.length > 1 && (
          <>
            <button
              aria-label="oldingi"
              onClick={() => setI((v) => (v - 1 + list.length) % list.length)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/70 backdrop-blur transition hover:border-white/40"
            >
              ‹
            </button>
            <button
              aria-label="keyingi"
              onClick={() => setI((v) => (v + 1) % list.length)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/70 backdrop-blur transition hover:border-white/40"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full border border-line bg-ink/70 px-3 py-1 text-[11px] text-muted backdrop-blur">
              {i + 1} / {list.length}
            </span>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div ref={thumbsRef} className="no-scrollbar flex gap-3 overflow-x-auto">
          {list.map((src, idx) => (
            <button
              key={src}
              onClick={() => setI(idx)}
              className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl border transition ${
                idx === i ? 'border-accent' : 'border-line hover:border-white/35'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
