'use client';

import { cloneElement, useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * "Magnit" hover effekti — element mishkaga qarab yumshoq siljiydi,
 * chiqib ketganda elastik ravishda joyiga qaytadi.
 *
 * <Magnetic><Link className="btn-primary">...</Link></Magnetic>
 *
 * strength — siljish kuchi (0.2 = yengil, 0.6 = kuchli)
 * scale    — hover paytidagi kattalashish
 */
export default function Magnetic({ children, strength = 0.35, scale = 1.03 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };

    const onEnter = () =>
      gsap.to(el, { scale, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });

    const onLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: 'elastic.out(1, 0.4)',
        overwrite: 'auto',
      });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'all' });
    };
  }, [strength, scale]);

  return cloneElement(children, { ref });
}
