'use client';

import Link from 'next/link';
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
    open: 'Ichini ko‘rish',
    close: 'Yopish',
    items: 'ta skin',
    loading: 'Tanlanmoqda…',
    empty: "Bu balansga mos skin topilmadi. Balansni oshirib ko'ring.",
    error: "Skinlarni yuklab bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
    names: {
      duo: ['Ikkita kuchli skin', 'Balans teng ikkiga bo‘lingan'],
      lead: ['Asosiy + yordamchi', 'Bitta kuchli qurol va unga juft skin'],
      kit: ["Qurol to'plami", 'Avtomat + snayper + pistolet'],
      premium: ['Premium', 'Pichoq yoki qo‘lqop + qurol'],
      trio: ['Uchta skin', 'Teng taqsimlangan 3 ta skin'],
      mix: ['Arzon-mazali', '4–5 ta ommabop skin, har xil turdan'],
      duo2: ['Ikkita skin (variant)', 'Boshqa ommabop juftlik'],
      kit2: ["Qurol to'plami (variant)", 'Boshqa avtomat + snayper + pistolet'],
      trio2: ['Uchta skin (variant)', 'Boshqa ommabop uchlik'],
      lead2: ['Asosiy + yordamchi (variant)', 'Boshqa kuchli juftlik'],
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
    open: 'Посмотреть состав',
    close: 'Закрыть',
    items: 'скина',
    loading: 'Подбираем…',
    empty: 'Под этот баланс скинов не нашлось. Попробуйте увеличить сумму.',
    error: 'Не удалось загрузить скины. Попробуйте позже.',
    names: {
      duo: ['Два сильных скина', 'Баланс поровну на два'],
      lead: ['Основной + дополнительный', 'Одно сильное оружие и пара к нему'],
      kit: ['Набор оружия', 'Винтовка + снайперка + пистолет'],
      premium: ['Премиум', 'Нож или перчатки + оружие'],
      trio: ['Три скина', 'Поровну на три скина'],
      mix: ['Дёшево и интересно', '4–5 популярных скинов разных типов'],
      duo2: ['Два скина (вариант)', 'Другая популярная пара'],
      kit2: ['Набор оружия (вариант)', 'Другая винтовка + снайперка + пистолет'],
      trio2: ['Три скина (вариант)', 'Другая популярная тройка'],
      lead2: ['Основной + дополнительный (вариант)', 'Другая сильная пара'],
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
  const [openSet, setOpenSet] = useState(null);

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
    if (!input || !Number.isFinite(n) || n <= 0) return;
    const id = setTimeout(() => setBudget(Math.round(n)), 500);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    let dead = false;
    setStatus('loading');
    const base = { priceTo: String(budget), wear: 'Factory New,Minimal Wear,Field-Tested', offset: '0', sort: 'count_desc' };
    const from = (k) => String(Math.round(budget * k));
    const reqs = [
      { ...base, priceFrom: from(0.08), limit: '120' },
      { ...base, sort: 'price_desc', limit: '60' },
      { ...base, priceFrom: from(0.1), weaponType: 'rifle', limit: '60' },
      { ...base, priceFrom: from(0.08), weaponType: 'sniper', limit: '60' },
      { ...base, priceFrom: from(0.05), weaponType: 'pistol', limit: '60' },
      { ...base, priceFrom: from(0.05), weaponType: 'smg', limit: '40' },
      { ...base, priceFrom: from(0.05), weaponType: 'heavy', limit: '40' },
      { ...base, priceFrom: from(0.2), weaponType: 'knife', limit: '40' },
      { ...base, priceFrom: from(0.2), weaponType: 'gloves', limit: '40' },
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

  // modalni Esc bilan yopish + orqa fon aylanmasin
  useEffect(() => {
    if (!openSet) return;
    const onKey = (e) => e.key === 'Escape' && setOpenSet(null);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openSet]);

  function addAll(set) {
    set.items.forEach((p) => add(p));
    setAddedKey(set.key);
    setTimeout(() => setAddedKey(null), 1500);
  }

  const chip = 'rounded-lg border px-3 py-2 text-sm transition';
  const current = openSet ? sets.find((s) => s.key === openSet) : null;

  return (
    <section className="container-wide pb-12 pt-6">
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
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4">
            {sets.map((s) => {
              const [name, desc] = L.names[s.key] || [s.key, ''];
              const odd = s.items.length % 2 === 1 && s.items.length > 1;
              return (
                <div
                  key={s.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenSet(s.key)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenSet(s.key))}
                  className="card card-hover flex cursor-pointer flex-col p-4 text-left outline-none focus-visible:border-white/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{name}</div>
                      <div className="mt-0.5 truncate text-xs text-muted">{desc}</div>
                    </div>
                    <span className="flex-none rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/65">
                      {s.items.length} {L.items}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {s.items.map((p, i) => (
                      <div
                        key={p.id}
                        className={`relative overflow-hidden rounded-xl border border-line bg-ink/40 px-2 pb-2 pt-1 ${odd && i === s.items.length - 1 ? 'col-span-2' : ''}`}
                      >
                        <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className={`relative ${odd && i === s.items.length - 1 ? 'aspect-[16/7]' : 'aspect-[4/3]'}`} />
                        <div className="truncate text-[11px] text-white/80">{p.name}</div>
                        <div className="text-[11px] text-white/45">{fmt(p.price)} so&apos;m</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">{L.total}</span>
                      <span className="text-lg font-bold">{fmt(s.total)} so&apos;m</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-white/45">
                      <span>{L.left}</span>
                      <span>{fmt(Math.max(0, budget - s.total))} so&apos;m</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addAll(s);
                      }}
                      className="btn-primary mt-3 w-full"
                    >
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
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5">
            {popular.map((p) => (
              <CatalogCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}

      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpenSet(null)}>
          <div className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <div className="text-lg font-semibold">{(L.names[current.key] || [current.key])[0]}</div>
                <div className="text-xs text-muted">{(L.names[current.key] || [])[1]}</div>
              </div>
              <button onClick={() => setOpenSet(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-white/70 hover:text-white">
                {L.close}
              </button>
            </div>
            <ul className="admin-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {current.items.map((p) => (
                <li key={p.id} className="flex items-center gap-4 rounded-xl border border-line bg-ink/40 p-3">
                  <Link href={`/mahsulot/${p.id}`} className="block w-28 flex-none">
                    <ProductMedia product={{ ...p, tone: 'from-transparent to-transparent' }} className="relative aspect-[4/3]" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/mahsulot/${p.id}`} className="block truncate text-sm font-semibold hover:text-accent">
                      {p.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-white/50">
                      {p.wear || ''} {p.stattrak ? '· StatTrak' : ''}
                    </div>
                    <div className="mt-1 text-sm font-bold">{fmt(p.price)} so&apos;m</div>
                  </div>
                  <button
                    onClick={() => add(p)}
                    aria-label="add"
                    className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-white/15 bg-white/[0.04] text-white/85 transition hover:border-white/40 hover:bg-white/10"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">{L.total}</span>
                <span className="text-xl font-bold">{fmt(current.total)} so&apos;m</span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-white/45">
                <span>{L.left}</span>
                <span>{fmt(Math.max(0, budget - current.total))} so&apos;m</span>
              </div>
              <button onClick={() => addAll(current)} className="btn-primary mt-3 w-full">
                {addedKey === current.key ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
                {addedKey === current.key ? L.added : L.addAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
