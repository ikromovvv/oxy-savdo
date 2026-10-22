'use client';

import { useEffect, useRef, useState } from 'react';

// Brendlangan kirish animatsiyasi (faqat bir sessiyada bir marta, route almashganda qaytmaydi).
// Foiz: haqiqiy yuklanish bosqichlariga (shrift + sahifa `load`) bog'langan, vaqt bilan
// ushlab turiladi — animatsiya ketma-ketligi tugamaguncha 100% bo'lmaydi.
const KEY = 'oxy:intro';
const MIN_MS = 2800; // animatsiya to'liq ko'rinishi uchun
const MIN_MS_REDUCED = 350;
const MAX_MS = 6500; // hech qachon qotib qolmasin

const SAVDO = ['S', 'A', 'V', 'D', 'O'];

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
    const start = performance.now();

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
      timers.current.push(
        setTimeout(() => {
          setPhase('gone');
          root.classList.remove('intro-lock');
        }, reduce ? 200 : 1000)
      );
    };

    const tick = (now) => {
      const el = now - start;
      const milestone = loaded && fonts ? 100 : loaded || fonts ? 72 : 28;
      const timeCap = Math.min(100, (el / minMs) * 100);
      const goal = Math.min(milestone, timeCap);
      shown += (goal - shown) * 0.12;
      const p = Math.min(100, Math.round(shown));
      setPct((prev) => (prev === p ? prev : p));

      if ((p >= 99 && el >= minMs && loaded && fonts) || el >= MAX_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

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
          <span className="intro-letter" style={{ '--d': '0.35s' }}>O</span>
          <span className="intro-letter" style={{ '--d': '0.7s' }}>X</span>
          <span className="intro-letter" style={{ '--d': '1.05s' }}>Y</span>
          <span className="intro-streak" />
        </div>

        <div className="intro-sub" aria-hidden="true">
          {SAVDO.map((c, i) => (
            <span key={i} style={{ '--d': `${1.9 + i * 0.09}s` }}>{c}</span>
          ))}
        </div>

        <div className="intro-bar" aria-hidden="true">
          <span className="intro-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className="intro-pct" aria-hidden="true">{String(pct).padStart(2, '0')}%</div>
      </div>
    </div>
  );
}
