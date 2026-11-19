'use client';

import { useEffect, useRef, useState } from 'react';
import { playSfx } from '@/lib/sfx';

// Brendlangan kirish animatsiyasi (faqat bir sessiyada bir marta, route almashganda qaytmaydi).
// Qisqa va silliq: harflar pastdan "ko'tariladi", logotip joylashadi, ingichka chiziq yuklanishni ko'rsatadi,
// sahifa tayyor bo'lishi bilan yuqoriga "parda" bo'lib ochiladi (~1.5 s, eng ko'pi 3.2 s).
// Foiz haqiqiy yuklanish bosqichlariga (shrift + sahifa `load`) bog'langan.
const KEY = 'oxy:intro';
const MIN_MS = 1500; // harflar to'liq chiqib, bir lahza ko'rinib turishi uchun
const MIN_MS_REDUCED = 500;
const MAX_MS = 3200; // hech qachon qotib qolmasin
const EXIT_MS = 850; // "parda" ochilish animatsiyasi (CSS bilan bir xil)

const LETTERS = ['O', 'X', 'Y'];
const SAVDO = 'SAVDO'.split('');

export default function IntroLoader() {
  const [phase, setPhase] = useState('on'); // on | out | gone
  const [pct, setPct] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {
      /* private rejim — har safar ko'rsatamiz */
    }
    if (seen) {
      setPhase('gone');
      return undefined;
    }

    const root = document.documentElement;
    root.classList.add('intro-lock');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minMs = reduce ? MIN_MS_REDUCED : MIN_MS;
    // CSS animatsiyalar birinchi chizilishdan boshlanadi — hisobni ham shundan boshlaymiz
    const paint = performance.getEntriesByName('first-paint')[0] || performance.getEntriesByName('first-contentful-paint')[0];
    const start = paint ? Math.min(paint.startTime, performance.now()) : performance.now();

    let loaded = document.readyState === 'complete';
    let fonts = !document.fonts;
    if (document.fonts) {
      document.fonts.ready.then(
        () => { fonts = true; },
        () => { fonts = true; }
      );
    }
    const onLoad = () => { loaded = true; };
    window.addEventListener('load', onLoad);

    let raf = 0;
    let shown = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {
        /* e'tiborsiz */
      }
      setPct(100);
      setPhase('out');
      playSfx('whoosh'); // brauzer ovozni bloklagan bo'lsa jim o'tadi
      timers.current.push(
        setTimeout(() => {
          setPhase('gone');
          root.classList.remove('intro-lock');
        }, reduce ? 150 : EXIT_MS)
      );
    };

    const tick = (now) => {
      const el = now - start;
      const milestone = loaded && fonts ? 100 : loaded || fonts ? 72 : 28;
      const timeCap = Math.min(100, (el / minMs) * 100);
      const goal = Math.min(milestone, timeCap);
      shown += (goal - shown) * 0.14;
      const p = Math.min(100, Math.round(shown));
      setPct((prev) => (prev === p ? prev : p));

      if ((p >= 99 && el >= minMs && loaded && fonts) || el >= MAX_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF to'xtab qolsa (fon tab, sekin qurilma) ham yopilish kafolatlanadi
    timers.current.push(setTimeout(finish, MAX_MS + 1200));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('load', onLoad);
      timers.current.forEach(clearTimeout);
      root.classList.remove('intro-lock');
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className="intro-root"
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-label="OXY SAVDO yuklanmoqda"
    >
      <div className="intro-glow" aria-hidden="true" />

      <div className="intro-stage">
        <div className="intro-logo" aria-hidden="true">
          {LETTERS.map((c, i) => (
            <span key={c} className="intro-mask">
              <span className="intro-letter" style={{ '--d': `${0.12 + i * 0.1}s` }}>{c}</span>
            </span>
          ))}
          <span className="intro-shine" />
        </div>

        <div className="intro-sub" aria-hidden="true">
          {SAVDO.map((c, i) => (
            <span key={i} style={{ '--d': `${0.75 + i * 0.07}s` }}>{c}</span>
          ))}
        </div>

        <div className="intro-bar" aria-hidden="true">
          <span className="intro-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>
    </div>
  );
}
