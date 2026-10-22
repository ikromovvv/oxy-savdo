'use client';

import { useEffect } from 'react';

// Telegram Mini App ichida ochilganda ilovani to'liq balandlikka yoyadi.
export default function TgWebApp() {
  useEffect(() => {
    if (!/tgWebApp/i.test(window.location.hash)) return;
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.onload = () => {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch {
        /* Mini App tashqarisida bo'lsa e'tiborsiz */
      }
    };
    document.head.appendChild(s);
  }, []);
  return null;
}
