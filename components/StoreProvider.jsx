'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { t as translate } from '@/lib/i18n';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [lang, setLang] = useState('uz');
  const [items, setItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    try {
      const l = localStorage.getItem('oxy_lang');
      const c = localStorage.getItem('oxy_cart');
      const f = localStorage.getItem('oxy_favorites');
      if (l) setLang(l);
      if (c) setItems(JSON.parse(c));
      if (f) {
        const parsed = JSON.parse(f);
        // eski versiyada favorites shunchaki id string massivi edi —
        // moslashtirib olamiz
        setFavorites(
          Array.isArray(parsed) ? parsed.map((x) => (typeof x === 'string' ? { id: x } : x)) : []
        );
      }
    } catch (e) {}
    setReady(true);
  }, []);

  // Steam orqali kirilgan bo'lsa, sessiyani serverdan olib kelamiz
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.loggedIn ? d : null))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('oxy_lang', lang);
      localStorage.setItem('oxy_cart', JSON.stringify(items));
      localStorage.setItem('oxy_favorites', JSON.stringify(favorites));
    } catch (e) {}
  }, [lang, items, favorites, ready]);

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
      user,
      userLoading,
      favorites,
      isFavorite: (id) => favorites.some((f) => f.id === id),
      // to'liq mahsulot obyektini yuboring — shunda "saqlangan" sahifasida
      // qayta so'rovsiz ko'rsatish mumkin (skinlar endi statik ro'yxatda emas)
      toggleFavorite: (product) =>
        setFavorites((prev) =>
          prev.some((f) => f.id === product.id)
            ? prev.filter((f) => f.id !== product.id)
            : [
                ...prev,
                {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image || '',
                  tone: product.tone || '',
                  weaponType: product.weaponType || null,
                  wear: product.wear || null,
                },
              ]
        ),
      favoritesCount: favorites.length,
    };
  }, [lang, items, cartOpen, user, userLoading, favorites]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
