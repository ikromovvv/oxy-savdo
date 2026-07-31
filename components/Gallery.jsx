'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ProductMedia } from './ProductCard';

/**
 * Mahsulot rasm galereyasi.
 *
 * Sahifa ochilganda: rasm katta holda ekran o'ngida paydo bo'ladi va
 * spiral traektoriya bo'ylab (tashqi qatlam aylanadi + ichki qatlam
 * markazga siljiydi) kichrayib o'z "quti"siga borib joylashadi.
 * Keyin thumbnail'lar navbatma-navbat uchib kelib tushadi.
 */
export default function Gallery({ product }) {
  const list = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);
  const [i, setI] = useState(0);

  const boxRef = useRef(null);      // asosiy rasm joyi
  const mainRef = useRef(null);     // asosiy rasm (ichki div)
  const thumbsRef = useRef(null);
  const flyRef = useRef(null);      // uchuvchi qatlam (fixed)
  const flySpinRef = useRef(null);  // aylanuvchi qatlam
  const flyMoveRef = useRef(null);  // siljuvchi qatlam
  const first = useRef(true);

  // ---- kirish animatsiyasi (spiral) ----
  useLayoutEffect(() => {
    const box = boxRef.current;
    const fly = flyRef.current;
    const spin = flySpinRef.current;
    const move = flyMoveRef.current;
    if (!box || !fly || !spin || !move) return;

    // uchib kelish animatsiyasi FAQAT kovriklar uchun
    if (product.category !== 'kovriklar') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const rect = box.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // uchuvchi qatlamni aynan "quti" ustiga qo'yamiz
    gsap.set(fly, {
      display: 'block',
      position: 'fixed',
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      zIndex: 60,
      perspective: 1400,
    });

    // asosiy rasm hozircha ko'rinmaydi
    gsap.set(mainRef.current, { opacity: 0 });
    gsap.set(thumbsRef.current, { opacity: 0 });

    const ctx = gsap.context(() => {
      // boshlang'ich holat: uzun yoyilgan kovrik ekran chetidan uchib keladi
      gsap.set(spin, { rotate: 9, transformOrigin: '50% 50%' });
      gsap.set(move, {
        x: vw * 0.45,
        y: -vh * 0.18,
        scaleY: Math.max(1.6, (vw * 0.75) / rect.width),
        scaleX: Math.max(1.6, (vw * 0.75) / rect.width) * 1.3, // yoyilgan (cho'zilgan) ko'rinish
        rotateY: -42,
        rotateX: 46,
        opacity: 0,
        transformOrigin: '50% 50%',
      });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(fly, { display: 'none' });
          gsap.set(mainRef.current, { opacity: 1, clearProps: 'opacity' });
        },
      });

      tl.to(move, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
        // yengil qiyshayish tekislanadi
        .to(spin, { rotate: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
        // gorizontal parvoz
        .to(move, { x: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
        // vertikal — biroz kech tushadi, shu bois yoy hosil bo'ladi
        .to(move, { y: 0, duration: 1.5, ease: 'power1.in' }, 0.12)
        // 3D holatdan tekis holatga + cho'zilgan ko'rinish yig'iladi
        .to(
          move,
          { rotateY: 0, rotateX: 0, scaleX: 1, scaleY: 1, duration: 1.45, ease: 'power3.out' },
          0.15
        )
        // qutiga "qo'nish"
        .to(box, { scale: 1.02, duration: 0.18, ease: 'power2.out' }, '-=0.18')
        .to(box, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.55)' })
        // thumbnail'lar
        .to(thumbsRef.current, { opacity: 1, duration: 0.01 }, '-=0.5')
        .from(
          thumbsRef.current ? Array.from(thumbsRef.current.children) : [],
          {
            y: 26,
            scale: 0.6,
            rotate: -120,
            opacity: 0,
            duration: 0.65,
            ease: 'back.out(1.7)',
            stagger: 0.09,
            clearProps: 'all',
          },
          '-=0.45'
        );
    }, boxRef);

    // ehtiyot chorasi
    const failsafe = setTimeout(() => {
      gsap.set(fly, { display: 'none' });
      gsap.set([mainRef.current, thumbsRef.current], { clearProps: 'all' });
    }, 4500);

    return () => {
      clearTimeout(failsafe);
      ctx.revert();
      gsap.set(fly, { display: 'none' });
      gsap.set([mainRef.current, thumbsRef.current], { clearProps: 'all' });
    };
  }, [product.id, product.category]);

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

  return (
    <div className="flex flex-col gap-3">
      {/* spiral bo'lib uchib keladigan qatlam */}
      <div ref={flyRef} className="pointer-events-none hidden" aria-hidden="true">
        <div ref={flySpinRef} className="h-full w-full">
          <div ref={flyMoveRef} className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={list[0]}
              alt=""
              className="h-full w-full rounded-2xl border border-line object-cover shadow-2xl shadow-black/60"
            />
          </div>
        </div>
      </div>

      <div ref={boxRef} className="relative">
        <ProductMedia
          product={product}
          src={list[i]}
          innerRef={mainRef}
          className="aspect-[4/3] w-full rounded-2xl border border-line"
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
