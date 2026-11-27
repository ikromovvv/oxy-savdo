'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Anonim tashrif hisoblagich: har sahifa ochilganda 1 ta so'rov, ochiq turgan tab uchun
// har 60 soniyada "tirikman" signali (hisobga tashrif sifatida qo'shilmaydi).
// Shaxsiy ma'lumot yuborilmaydi — faqat localStorage'dagi tasodifiy ID.
function getVid() {
  try {
    let v = localStorage.getItem('oxy:vid');
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '');
      localStorage.setItem('oxy:vid', v);
    }
    return v;
  } catch {
    return null;
  }
}

function send(hb) {
  const vid = getVid();
  if (!vid) return;
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid, hb }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    send(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') send(true);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  return null;
}
