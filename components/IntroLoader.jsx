'use client';

import { useEffect, useRef, useState } from 'react';
import { playSfx } from '@/lib/sfx';

// Brendlangan kirish animatsiyasi. Qaytgan mijozga (7 kun ichida) umuman ko'rsatilmaydi, bir sessiyada bir marta.
// Logotip kontur bo'lib "chiziladi", so'ng to'ladi va yorug'lik chizig'i o'tadi; ingichka chiziq yuklanishni ko'rsatadi,
// sahifa tayyor bo'lishi bilan yuqoriga "parda" bo'lib ochiladi (~1 s, eng ko'pi 2.6 s).
// Intro davomida bosh sahifa skinlari oldindan so'raladi (CDN keshi isiydi) — parda ochilganda tayyor turadi.
const KEY = 'oxy:intro'; // sessiya (sessionStorage)
const KEY_SEEN = 'oxy:intro-seen'; // oxirgi ko'rsatilgan vaqt (localStorage) — layout.jsx dagi skript ham shuni o'qiydi
const SEEN_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_MS = 1000; // logotip chizilib bo'lishi uchun
const MIN_MS_REDUCED = 400;
const MAX_MS = 2600; // hech qachon qotib qolmasin
const EXIT_MS = 700; // "parda" ochilish animatsiyasi (CSS bilan bir xil)

const SAVDO = 'SAVDO'.split('');

export default function IntroLoader() {
  const [phase, setPhase] = useState('on'); // on | out | gone
  const [pct, setPct] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
      if (!seen) {
        const t = Number(localStorage.getItem(KEY_SEEN));
        seen = t > 0 && Date.now() - t < SEEN_MS;
      }
    } catch {
      /* private rejim — har safar ko'rsatamiz */
    }
    if (seen) {
      setPhase('gone');
      return undefined;
    }

    const root = document.documentElement;
    root.classList.add('intro-lock');

    // Intro paytida bosh sahifa skinlarini oldindan so'raymiz (Vercel CDN isiydi, keyin tez ochiladi)
    if (location.pathname === '/') fetch('/api/skins?limit=120&sort=price_desc').catch(() => {});

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
        localStorage.setItem(KEY_SEEN, String(Date.now()));
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
        <div className="intro-mark" aria-hidden="true">
          <svg viewBox="0 0 420 150" className="intro-svg">
            <defs>
              <linearGradient id="introGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#e9ecf1" />
                <stop offset="100%" stopColor="#a9afb9" />
              </linearGradient>
            </defs>
            <text x="50%" y="118" textAnchor="middle" className="intro-glyphs">OXY</text>
          </svg>
          <span className="intro-shine" />
        </div>

        <div className="intro-sub" aria-hidden="true">
          {SAVDO.map((c, i) => (
            <span key={i} style={{ '--d': `${0.6 + i * 0.05}s` }}>{c}</span>
          ))}
        </div>

        <div className="intro-bar" aria-hidden="true">
          <span className="intro-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>
    </div>
  );
}
