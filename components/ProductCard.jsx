'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from './StoreProvider';
import { formatPrice } from '@/lib/products';

export function ProductMedia({ product, className = '', innerRef, src }) {
  const image = src || product.image;
  return (
    <div className={`product-media relative overflow-hidden ${className}`}>
      <div
        ref={innerRef}
        className={`h-full w-full bg-gradient-to-br ${product.tone || 'from-white/10 to-black'} will-change-transform`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span className="px-6 text-center text-xl font-semibold tracking-tight text-white/85">
              {product.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductCard({ product }) {
  const { t, lang, add } = useStore();
  const [done, setDone] = useState(false);
  const cardRef = useRef(null);
  const mediaRef = useRef(null);
  const btnRef = useRef(null);

  const onEnter = () => {
    gsap.to(mediaRef.current, { scale: 1.06, duration: 0.6, ease: 'power3.out' });
    gsap.to(cardRef.current, { y: -6, duration: 0.45, ease: 'power3.out' });
  };

  const onLeave = () => {
    gsap.to(mediaRef.current, { scale: 1, duration: 0.6, ease: 'power3.out' });
    gsap.to(cardRef.current, { y: 0, duration: 0.45, ease: 'power3.out' });
  };

  const onAdd = () => {
    add(product);
    setDone(true);
    gsap.fromTo(
      btnRef.current,
      { scale: 0.88 },
      { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
    );
    gsap.fromTo(
      cardRef.current,
      { boxShadow: '0 0 0 0 rgba(200,255,46,0.45)' },
      { boxShadow: '0 0 0 6px rgba(200,255,46,0)', duration: 0.7, ease: 'power2.out' }
    );
    setTimeout(() => setDone(false), 1200);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="card flex flex-col overflow-hidden p-3 transition-colors hover:border-white/25"
    >
      <Link href={`/mahsulot/${product.id}`}>
        <ProductMedia product={product} innerRef={mediaRef} className="aspect-[4/3] rounded-xl" />
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/mahsulot/${product.id}`}
            className="text-[15px] font-medium leading-snug transition-colors hover:text-accent"
          >
            {product.name}
          </Link>
          {product.badge && (
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
              {product.badge[lang]}
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-muted">{product.short[lang]}</p>

        <div className="mt-4 flex items-center justify-between pt-2">
          <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
          <button
            ref={btnRef}
            onClick={onAdd}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              done ? 'bg-accent text-ink' : 'border border-line text-white/85 hover:border-white/40'
            }`}
          >
            {done ? t('added') : t('add_to_cart')}
          </button>
        </div>
      </div>
    </div>
  );
}
