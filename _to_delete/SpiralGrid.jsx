'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Kovriklar katalogi uchun spiral animatsiya.
 * Avval karta "qutisi" ochiladi, keyin kovrik rasmi spiral bo'ylab
 * aylanib kelib quti ichiga joylashadi.
 *
 * Spiral effekti: tashqi element aylanadi (rotate), ichkarisi esa
 * markazdan siljigan (x) — ikkisi birga spiral traektoriya beradi.
 */
export default function SpiralGrid({ children, className = '' }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const cards = Array.from(root.children);
    if (!cards.length) return;

    const medias = cards
      .map((c) => c.querySelector('.product-media > div'))
      .filter(Boolean);
    const bodies = cards
      .map((c) => c.querySelector('.product-media')?.parentElement?.nextElementSibling)
      .filter(Boolean);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.set(cards, { opacity: 0, scale: 0.94, y: 26, transformOrigin: '50% 50%' });
      gsap.set(medias, {
        opacity: 0,
        scale: 0.25,
        rotate: -540,
        xPercent: 55,
        yPercent: -25,
        transformOrigin: '50% 50%',
      });
      gsap.set(bodies, { opacity: 0, y: 14 });

      const tl = gsap.timeline({ delay: 0.1 });

      // 1) qutilar ochiladi
      tl.to(cards, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.1,
      });

      // 2) kovriklar spiral bo'ylab quti ichiga tushadi
      tl.to(
        medias,
        {
          opacity: 1,
          scale: 1,
          rotate: 0,
          xPercent: 0,
          yPercent: 0,
          duration: 1.15,
          ease: 'power4.out',
          stagger: 0.13,
        },
        '-=0.35'
      );

      // 3) matn qismi
      tl.to(
        bodies,
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1 },
        '-=0.75'
      );

      tl.add(() => gsap.set([...cards, ...medias, ...bodies], { clearProps: 'all' }));
    }, ref);

    // ehtiyot chorasi
    const failsafe = setTimeout(
      () => gsap.set([...cards, ...medias, ...bodies], { clearProps: 'all' }),
      4000
    );

    return () => {
      clearTimeout(failsafe);
      ctx.revert();
      gsap.set([...cards, ...medias, ...bodies], { clearProps: 'all' });
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
