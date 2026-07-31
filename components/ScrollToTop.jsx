'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Sahifa (route) almashganda scroll tepaga qaytadi.
 * Lenis smooth scroll bilan ham to'g'ri ishlaydi.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    const lenis = typeof window !== 'undefined' ? window.__lenis : null;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname]);

  return null;
}
