'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Scroll bilan paydo bo'ladigan animatsiya (IntersectionObserver + GSAP).
 * ScrollTrigger ishlatilmaydi — Lenis bilan pozitsiya xatosi bo'lmaydi,
 * element hech qachon ko'rinmay qolib ketmaydi.
 *
 * <Reveal>...</Reveal>          — blok ko'tarilib chiqadi
 * <Reveal stagger>...</Reveal>  — ichidagilar navbatma-navbat chiqadi
 */
export default function Reveal({
  children,
  stagger = false,
  y = 32,
  delay = 0,
  duration = 0.8,
  className = '',
  as: Tag = 'div',
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger ? Array.from(el.children) : [el];
    if (!targets.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      gsap.set(targets, { clearProps: 'all' });
      return;
    }

    gsap.set(targets, { y, opacity: 0 });

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      gsap.to(targets, {
        y: 0,
        opacity: 1,
        duration,
        delay,
        ease: 'power3.out',
        stagger: stagger ? 0.09 : 0,
        clearProps: 'transform',
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);

    // ehtiyot chorasi: 2.5 soniyadan keyin baribir ko'rsatamiz
    const failsafe = setTimeout(play, 2500);

    return () => {
      clearTimeout(failsafe);
      io.disconnect();
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: 'all' });
    };
  }, [stagger, y, delay, duration]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
