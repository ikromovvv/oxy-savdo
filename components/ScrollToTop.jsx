'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Sahifa (route) almashganda scroll tepaga qaytadi.
 * (Oddiy brauzer scroll'i — smooth-scroll kutubxonasi ishlatilmaydi.)
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // skin variantini (FN/MW/FT) almashtirish — sahifa o'rnida qoladi, tepaga sakramaydi
    if (window.__keepScroll) {
      window.__keepScroll = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
