'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import CatalogCard from '@/components/CatalogCard';
import { ProductMedia } from '@/components/ProductCard';
import { ShoppingCart, Check } from '@/components/icons';
import { buildSets, popularWithin } from '@/lib/balanceSets';

const QUICK = [200000, 500000, 1000000, 3000000];
const fmt = (n) => Number(n).toLocaleString('ru-RU');

const TXT = {
  uz: {
    title: 'Balansga qarab skin tanlash',
    sub: "Balansingizni kiriting — biz sig'adigan eng yaxshi to'plamlar va eng ommabop skinlarni ko'rsatamiz.",
    budget: "Balans, so'm",
    mine: 'Mening balansim',
    sets: "Tayyor to'plamlar",
    popular: 'Eng ommabop skinlar',
    total: 'Jami',
    left: 'Qoladi',
    addAll: 'Hammasini savatga',
    added: "Savatga qo'shildi",
    loading: 'Tanlanmoqda…',
    empty: "Bu balansga mos skin topilmadi. Balansni oshirib ko'ring.",
    error: "Skinlarni yuklab bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
    names: {
      single: ['Bitta kuchli skin', 'Balansning deyarli hammasiga eng yaxshi bitta skin'],
      kit: ["To'liq qurol to'plami", 'Avtomat + snayper + pistolet'],
      mix: ['Arzon-mazali', "4–5 ta ommabop skin, har xil turdan"],
    },
  },
  ru: {
    title: 'Подбор скинов по балансу',
    sub: 'Введите баланс — покажем лучшие наборы и самые популярные скины, которые на него хватит.',
    budget: 'Баланс, сум',
    mine: 'Мой баланс',
    sets: 'Готовые наборы',
    popular: 'Самые популярные скины',
    total: 'Итого',
    left: 'Останется',
    addAll: 'Всё в корзину',
    added: 'Добавлено в корзину',
    loading: 'Подбираем…',
    empty: 'Под этот баланс скинов не нашлось. Попробуйте увеличить сумму.',
    error: 'Не удалось загрузить скины. Попробуйте позже.',
    names: {
      single: ['Один сильный скин', 'Лучший один скин почти на весь баланс'],
      kit: ['Полный набор оружия', 'Винтовка + снайперка + пистолет'],
      mix: ['Дёшево и интересно', '4–5 популярных скинов разных типов'],
    },
  },
};

async function getJson(params) {
  const r = await fetch('/api/skins?' + new URLSearchParams(params).toString());
  if (!r.ok) throw new Error('http_' + r.status);
  const d = await r.json();
  if (d.error && !d.items?.length) throw new Error(d.error);
  return d.items || [];
}

export default function BalansClient() {
  const { lang, balance, add } = useStore();
  const L = TXT[lang] || TXT.uz;

  const [input, setInput] = useState('');
  const [budget, setBudget] = useState(500000);
  const [pool, setPool] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [addedKey, setAddedKey] = useState(null);

  // kirgan foydalanuvchi balansi bo'lsa — boshlang'ich qiymat sifatida
  useEffect(() => {
    if (balance > 0) {
      setBudget(Math.round(balance));
      setInput(String(Math.round(balance)));
    }
  }, [balance]);

  // yozish to'xtagach so'rov
  useEffect(() => {
    const n = Number(input);
    if (!input) return;
    if (!Number.isFinite(n) || n <= 0) return;
    const id = setTimeout(() => setBudget(Math.round(n)), 500);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    let dead = false;
    setStatus('loading');
    const base = { priceTo: String(budget), wear: 'Factory New,Minimal Wear,Field-Tested', offset: '0' };
    const reqs = [
      { ...base, priceFrom: String(Math.round(budget * 0.08)), sort: 'count_desc', limit: '120' },
      { ...base, sort: 'price_desc', limit: '60' },
      { ...base, priceFrom: String(Math.round(budget * 0.2)), sort: 'count_desc', weaponType: 'rifle', limit: '60' },
      { ...base, priceFrom: String(Math.round(budget * 0.1)), sort: 'count_desc', weaponType: 'sniper', limit: '60' },
      { ...base, priceFrom: String(Math.round(budget * 0.07)), sort: 'count_desc', weaponType: 'pistol', limit: '60' },
    ];
    Promise.all(reqs.map(getJson))
      .then((lists) => {
        if (dead) return;
        setPool(lists.flat());
        setStatus('ok');
      })
      .catch(() => !dead && setStatus('error'));
    return () => {
      dead = true;
    };
  }, [budget]);

  const sets = useMemo(() => buildSets(pool, budget), [pool, budget]);
  const popular = useMemo(() => popularWithin(pool, budget, 20), [pool, budget]);

  function addAll(set) {
    set.items.forEach((p) => add(p));
    setAddedKey(set.key);
    setTimeout(() => setAddedKey(null), 1500);
  }

  const chip = 'rounded-lg border px-3 py-2 text-sm transition';

  return (
    <section className="container-site pb-12 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{L.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{L.sub}</p>

      <div className="card mt-6 flex flex-wrap items-end gap-4 p-5">
        <label className="block w-full sm:w-64">
          <span className="label mb-2 block">{L.budget}</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fmt(budget)}
            className="w-full rounded-xl border border-line bg-ink/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-white/40"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => {
                setInput(String(q));
                setBudget(q);
              }}
              className={`${chip} ${budget === q ? 'border-white/40 bg-white/10 text-white' : 'border-line text-white/70 hover:border-white/30'}`}
            >
              {fmt(q)}
            </button>
          ))}
          {balance > 0 && (
            <button
              onClick={() => {
                setInput(String(Math.round(balance)));
                setBudget(Math.round(balance));
              }}
              className={`${chip} border-accent/50 text-accent hover:bg-accent/10`}
            >
              {L.mine}: {fmt(balance)}
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && <div className="mt-8 text-sm text-muted">{L.loading}</div>}
      {status === 'error' && <div className="mt-8 text-sm text-red-300">{L.error}</div>}
      {status === 'ok' && !sets.length && !popular.length && <div className="mt-8 text-sm text-muted">{L.empty}</div>}

      {status === 'ok' && sets.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">{L.sets}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {sets.map((s) => {
              const [name, desc] = L.names[s.key];
              return (
                <div key={s.key} className="card flex flex-col p-5">
                  <div className="text-base font-semibold">{name}</div>
                  <div className="mt-1 text-xs text-muted">{desc}</div>
                  <ul className="mt-4 space-y-2">
                    {s.items.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className="relative h-12 w-16 flex-none" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{p.name}</div>
                          <div className="text-xs text-white/50">{fmt(p.price)} so&apos;m</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">{L.total}</span>
                      <span className="text-lg font-bold">{fmt(s.total)} so&apos;m</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-white/45">
                      <span>{L.left}</span>
                      <span>{fmt(Math.max(0, budget - s.total))} so&apos;m</span>
                    </div>
                    <button onClick={() => addAll(s)} className="btn-primary mt-3 w-full">
                      {addedKey === s.key ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
                      {addedKey === s.key ? L.added : L.addAll}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {status === 'ok' && popular.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">{L.popular}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popular.map((p) => (
              <CatalogCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
