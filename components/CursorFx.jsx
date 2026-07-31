'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Mishka bilan yuradigan effekt:
 *  - kichik nuqta (darhol ergashadi)
 *  - halqa (biroz kechikib, yumshoq ergashadi)
 *  - orqa fonda accent yorug'lik dog'i
 * Link/tugma ustida halqa kattalashadi, bosilganda qisqaradi.
 * Touch qurilmalarda va reduced-motion holatida umuman ishlamaydi.
 */
export default function CursorFx() {
  const dot = useRef(null);
  const ring = useRef(null);
  const glow = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const els = [dot.current, ring.current, glow.current];
    if (els.some((e) => !e)) return;

    gsap.set(els, { xPercent: -50, yPercent: -50, opacity: 0 });

    const move = {
      dotX: gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3.out' }),
      dotY: gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3.out' }),
      ringX: gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3.out' }),
      ringY: gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3.out' }),
      glowX: gsap.quickTo(glow.current, 'x', { duration: 0.9, ease: 'power3.out' }),
      glowY: gsap.quickTo(glow.current, 'y', { duration: 0.9, ease: 'power3.out' }),
    };

    let shown = false;
    const onMove = (e) => {
      if (!shown) {
        shown = true;
        gsap.to(els, { opacity: 1, duration: 0.3 });
      }
      move.dotX(e.clientX);
      move.dotY(e.clientY);
      move.ringX(e.clientX);
      move.ringY(e.clientY);
      move.glowX(e.clientX);
      move.glowY(e.clientY);

      // bosiladigan element ustidami?
      const t = e.target;
      const hot = t instanceof Element && t.closest('a, button, input, textarea, [role="button"]');
      gsap.to(ring.current, {
        scale: hot ? 1.9 : 1,
        borderColor: hot ? 'rgba(200,255,46,0.9)' : 'rgba(255,255,255,0.35)',
        duration: 0.3,
        ease: 'power3.out',
        overwrite: 'auto',
      });
      gsap.to(glow.current, { scale: hot ? 1.35 : 1, duration: 0.5, overwrite: 'auto' });
    };

    const onDown = () => gsap.to(ring.current, { scale: 0.75, duration: 0.15, overwrite: 'auto' });
    const onUp = () => gsap.to(ring.current, { scale: 1, duration: 0.25, overwrite: 'auto' });
    const onLeave = () => gsap.to(els, { opacity: 0, duration: 0.25 });
    const onEnter = () => gsap.to(els, { opacity: 1, duration: 0.25 });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      gsap.set(els, { clearProps: 'all' });
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] hidden md:block" aria-hidden="true">
      <div
        ref={glow}
        className="absolute left-0 top-0 h-[320px] w-[320px] rounded-full opacity-0"
        style={{
          background:
            'radial-gradient(circle, rgba(200,255,46,0.10) 0%, rgba(200,255,46,0.04) 35%, transparent 70%)',
        }}
      />
      <div
        ref={ring}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border opacity-0"
        style={{ borderColor: 'rgba(255,255,255,0.35)' }}
      />
      <div ref={dot} className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-accent opacity-0" />
    </div>
  );
}
