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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
