'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { t as translate } from '@/lib/i18n';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [lang, setLang] = useState('uz');
  const [items, setItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const l = localStorage.getItem('oxy_lang');
      const c = localStorage.getItem('oxy_cart');
      if (l) setLang(l);
      if (c) setItems(JSON.parse(c));
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('oxy_lang', lang);
      localStorage.setItem('oxy_cart', JSON.stringify(items));
    } catch (e) {}
  }, [lang, items, ready]);

  const value = useMemo(() => {
    const add = (product, qty = 1) =>
      setItems((prev) => {
        const i = prev.findIndex((x) => x.id === product.id);
        if (i > -1) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + qty };
          return next;
        }
        return [...prev, { id: product.id, name: product.name, price: product.price, qty }];
      });

    return {
      lang,
      setLang,
      t: (k) => translate(lang, k),
      items,
      add,
      remove: (id) => setItems((p) => p.filter((x) => x.id !== id)),
      setQty: (id, qty) =>
        setItems((p) =>
          qty <= 0 ? p.filter((x) => x.id !== id) : p.map((x) => (x.id === id ? { ...x, qty } : x))
        ),
      clear: () => setItems([]),
      count: items.reduce((s, x) => s + x.qty, 0),
      total: items.reduce((s, x) => s + x.qty * x.price, 0),
      cartOpen,
      setCartOpen,
    };
  }, [lang, items, cartOpen]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
