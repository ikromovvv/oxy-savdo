'use client';

import { useEffect, useState } from 'react';

export const fmt = (n) => Number(n).toLocaleString('ru-RU');

export const TXT = {
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
    items: 'ta skin',
    loading: 'Tanlanmoqda…',
    empty: "Bu balansga mos skin topilmadi. Balansni oshirib ko'ring.",
    error: "Skinlarni yuklab bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
    back: 'Balans bo‘yicha tanlash',
    budgetLabel: 'Balans',
    otherSets: "Boshqa to'plamlar",
    notFound: "Bu to'plam hozir topilmadi — narxlar o'zgargan bo'lishi mumkin.",
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
    items: 'скина',
    loading: 'Подбираем…',
    empty: 'Под этот баланс скинов не нашлось. Попробуйте увеличить сумму.',
    error: 'Не удалось загрузить скины. Попробуйте позже.',
    back: 'Подбор по балансу',
    budgetLabel: 'Баланс',
    otherSets: 'Другие наборы',
    notFound: 'Этот набор сейчас не найден — возможно, цены изменились.',
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

// Balansga mos nomzod skinlar havzasini yuklaydi (to'plamlar shundan yig'iladi)
export function useBalancePool(budget) {
  const [pool, setPool] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error

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

  return { pool, status };
}
