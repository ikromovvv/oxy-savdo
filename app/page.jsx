'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '@/components/StoreProvider';
import ProductCard, { ProductMedia } from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import Magnetic from '@/components/Magnetic';
import BuyCatalogHome from '@/components/BuyCatalogHome';
import { products, categories, formatPrice } from '@/lib/products';
import { site } from '@/lib/site';

export default function Home() {
  const { t, lang, add, user } = useStore();
  const heroRef = useRef(null);
  const featured = products.find((p) => p.featured) || products[0];
  const skins = products.filter((p) => p.category === 'skins').slice(0, 4);
  const pads = products.filter((p) => p.category === 'kovriklar').slice(0, 3);

  // Hero — sahifa ochilganda
  useLayoutEffect(() => {
    const root = heroRef.current;
    if (!root) return;

    const q = (sel) => Array.from(root.querySelectorAll(sel));
    const all = [...q('.hero-kicker'), ...q('.hero-title'), ...q('.hero-lead'), ...q('.hero-btn')];
    if (!all.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.set(all, { y: 20, opacity: 0 });
      gsap
        .timeline({
          defaults: { ease: 'power3.out', opacity: 1, y: 0 },
          // animatsiya tugagach inline style'lar tozalanadi
          onComplete: () => gsap.set(all, { clearProps: 'all' }),
        })
        .to('.hero-kicker', { duration: 0.6 })
        .to('.hero-title', { y: 0, duration: 0.9 }, '-=0.35')
        .to('.hero-lead', { duration: 0.7 }, '-=0.55')
        .to('.hero-btn', { duration: 0.6, stagger: 0.1 }, '-=0.45');
    }, heroRef);

    // ehtiyot chorasi: nima bo'lsa ham 2.5 s dan keyin ko'rinadi
    const failsafe = setTimeout(() => gsap.set(all, { clearProps: 'all' }), 2500);

    return () => {
      clearTimeout(failsafe);
      ctx.revert();
      gsap.set(all, { clearProps: 'all' });
    };
  }, []);

  // Steam orqali kirilgan bo'lsa, bosh sahifa "skin sotib olish" katalogiga almashadi
  if (user) {
    return <BuyCatalogHome />;
  }

  return (
    <>
      {/* HERO */}
      <section ref={heroRef} className="grid-fade border-b border-line">
        <div className="container-site flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center py-24 text-center">
          <span className="hero-kicker label">{t('hero_kicker')}</span>
          <h1 className="hero-title h-display mt-5 max-w-3xl">{t('hero_title')}</h1>
          <p className="hero-lead mt-5 max-w-xl text-base text-muted">{t('hero_text')}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Magnetic strength={0.4} scale={1.05}>
              <Link href="/katalog/kovriklar" className="hero-btn btn-primary">{t('hero_cta')}</Link>
            </Magnetic>
            <Magnetic strength={0.4} scale={1.05}>
              <a href={site.telegram} className="hero-btn btn-ghost">{t('hero_cta2')}</a>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* KATEGORIYALAR */}
      <section className="py-14">
        <Reveal stagger className="container-site grid gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Magnetic key={c.slug} strength={0.16} scale={1.02}>
              <Link
                href={`/katalog/${c.slug}`}
                className="card group flex items-center justify-between p-6 transition-colors duration-300 hover:border-white/30"
              >
                <span className="text-lg font-medium">{c[lang]}</span>
                <span className="text-muted transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-accent">
                  →
                </span>
              </Link>
            </Magnetic>
          ))}
        </Reveal>
      </section>

      {/* FEATURED */}
      <section className="container-site py-10">
        <Reveal className="card grid overflow-hidden lg:grid-cols-2">
          <ProductMedia product={featured} className="min-h-[320px]" />
          <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
            <span className="label">{t('featured')}</span>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{featured.name}</h2>
            <p className="text-muted">{featured.short[lang]}</p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-5">
              {featured.specs.map((s) => (
                <div key={s.v}>
                  <div className="label">{s[lang]}</div>
                  <div className="mt-1 text-sm">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xl font-semibold">{formatPrice(featured.price)}</span>
              <button onClick={() => add(featured)} className="btn-primary">{t('add_to_cart')}</button>
              <Link href={`/mahsulot/${featured.id}`} className="btn-ghost">{t('learn_more')}</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* SKINLAR */}
      <Section title={t('nav_skins')} href="/katalog/skins" cta={t('all_products')}>
        <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skins.map((p) => <ProductCard key={p.id} product={p} />)}
        </Reveal>
      </Section>

      {/* KOVRIKLAR */}
      <Section title={t('nav_pads')} href="/katalog/kovriklar" cta={t('all_products')}>
        <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pads.map((p) => <ProductCard key={p.id} product={p} />)}
        </Reveal>
      </Section>

      {/* NEGA BIZ */}
      <section className="container-site py-16">
        <Reveal as="h2" className="text-2xl font-semibold tracking-tight">
          {t('why')}
        </Reveal>
        <Reveal stagger className="mt-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-7">
              <div className="text-sm font-semibold text-accent">0{i}</div>
              <div className="mt-3 text-lg font-medium">{t(`why${i}_t`)}</div>
              <p className="mt-2 text-sm text-muted">{t(`why${i}_d`)}</p>
            </div>
          ))}
        </Reveal>
      </section>
    </>
  );
}

function Section({ title, href, cta, children }) {
  return (
    <section className="container-site py-10">
      <Reveal className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <Link href={href} className="text-sm text-muted hover:text-white">{cta} →</Link>
      </Reveal>
      {children}
    </section>
  );
}
