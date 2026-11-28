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

// Ingliz tili (es/zh/tr/kk uchun ham zaxira sifatida ishlatiladi)
TXT.en = {
  title: 'Pick skins by your balance',
  sub: 'Enter your balance — we will show the best sets and the most popular skins that fit.',
  budget: 'Balance, UZS',
  mine: 'My balance',
  sets: 'Ready-made sets',
  popular: 'Most popular skins',
  total: 'Total',
  left: 'Left',
  addAll: 'Add all to cart',
  added: 'Added to cart',
  items: 'skins',
  loading: 'Picking…',
  empty: 'No skins found for this balance. Try a larger amount.',
  error: 'Could not load skins. Please try again later.',
  back: 'Pick by balance',
  budgetLabel: 'Balance',
  otherSets: 'Other sets',
  notFound: 'This set was not found right now — prices may have changed.',
  names: {
    duo: ['Two strong skins', 'Balance split into two'],
    lead: ['Main + support', 'One strong weapon and a pair for it'],
    kit: ['Weapon set', 'Rifle + sniper + pistol'],
    premium: ['Premium', 'Knife or gloves + a weapon'],
    trio: ['Three skins', 'Three evenly split skins'],
    mix: ['Cheap and cheerful', '4–5 popular skins of different types'],
    duo2: ['Two skins (variant)', 'Another popular pair'],
    kit2: ['Weapon set (variant)', 'Another rifle + sniper + pistol'],
    trio2: ['Three skins (variant)', 'Another popular trio'],
    lead2: ['Main + support (variant)', 'Another strong pair'],
  },
};

TXT.es = {"title":"Elige skins según tu saldo","sub":"Introduce tu saldo: te mostraremos los mejores sets y las skins más populares que te caben.","budget":"Saldo, UZS","mine":"Mi saldo","sets":"Sets listos","popular":"Skins más populares","total":"Total","left":"Queda","addAll":"Añadir todo al carrito","added":"Añadido al carrito","items":"skins","loading":"Eligiendo…","empty":"No se encontraron skins para este saldo. Prueba con una cantidad mayor.","error":"No se pudieron cargar las skins. Inténtalo más tarde.","back":"Elegir por saldo","budgetLabel":"Saldo","otherSets":"Otros sets","notFound":"Este set no se encuentra ahora: puede que los precios hayan cambiado.","names":{"duo":["Dos skins potentes","El saldo dividido en dos"],"lead":["Principal + apoyo","Un arma potente y su pareja"],"kit":["Set de armas","Rifle + francotirador + pistola"],"premium":["Premium","Cuchillo o guantes + un arma"],"trio":["Tres skins","Tres skins con el saldo repartido a partes iguales"],"mix":["Barato y bueno","4–5 skins populares de distintos tipos"],"duo2":["Dos skins (variante)","Otra pareja popular"],"kit2":["Set de armas (variante)","Otro rifle + francotirador + pistola"],"trio2":["Tres skins (variante)","Otro trío popular"],"lead2":["Principal + apoyo (variante)","Otra pareja potente"]}};
TXT.zh = {"title":"按余额挑选饰品","sub":"输入您的余额——我们会为您展示可负担的最佳套装和最热门的饰品。","budget":"余额（UZS）","mine":"我的余额","sets":"现成套装","popular":"最热门饰品","total":"合计","left":"剩余","addAll":"全部加入购物车","added":"已加入购物车","items":"件饰品","loading":"正在挑选…","empty":"未找到适合该余额的饰品。请尝试更大的金额。","error":"无法加载饰品，请稍后再试。","back":"按余额挑选","budgetLabel":"余额","otherSets":"其他套装","notFound":"暂时找不到该套装——价格可能已变化。","names":{"duo":["两件强力饰品","余额平分为两份"],"lead":["主力 + 搭配","一件强力武器和与之搭配的饰品"],"kit":["武器套装","步枪 + 狙击枪 + 手枪"],"premium":["高端","刀具或手套 + 一件武器"],"trio":["三件饰品","余额平均分给三件饰品"],"mix":["物美价廉","4–5 件不同类型的热门饰品"],"duo2":["两件饰品（变体）","另一组热门组合"],"kit2":["武器套装（变体）","另一组步枪 + 狙击枪 + 手枪"],"trio2":["三件饰品（变体）","另一组热门三件套"],"lead2":["主力 + 搭配（变体）","另一组强力组合"]}};
TXT.tr = {"title":"Bakiyene göre skin seç","sub":"Bakiyenizi girin — bütçenize sığan en iyi setleri ve en popüler skinleri gösterelim.","budget":"Bakiye, UZS","mine":"Bakiyem","sets":"Hazır setler","popular":"En popüler skinler","total":"Toplam","left":"Kalan","addAll":"Hepsini sepete ekle","added":"Sepete eklendi","items":"skin","loading":"Seçiliyor…","empty":"Bu bakiyeye uygun skin bulunamadı. Daha yüksek bir tutar deneyin.","error":"Skinler yüklenemedi. Lütfen daha sonra tekrar deneyin.","back":"Bakiyeye göre seç","budgetLabel":"Bakiye","otherSets":"Diğer setler","notFound":"Bu set şu anda bulunamadı — fiyatlar değişmiş olabilir.","names":{"duo":["İki güçlü skin","Bakiye ikiye bölünür"],"lead":["Ana + yardımcı","Bir güçlü silah ve ona eş bir skin"],"kit":["Silah seti","Tüfek + keskin nişancı + tabanca"],"premium":["Premium","Bıçak veya eldiven + bir silah"],"trio":["Üç skin","Eşit bölünmüş 3 skin"],"mix":["Ucuz ve güzel","Farklı türlerden 4–5 popüler skin"],"duo2":["İki skin (alternatif)","Başka bir popüler çift"],"kit2":["Silah seti (alternatif)","Başka bir tüfek + keskin nişancı + tabanca"],"trio2":["Üç skin (alternatif)","Başka bir popüler üçlü"],"lead2":["Ana + yardımcı (alternatif)","Başka bir güçlü çift"]}};
TXT.kk = {"title":"Баланс бойынша скин таңдау","sub":"Балансыңызды енгізіңіз — сыятын ең жақсы жинақтар мен ең танымал скиндерді көрсетеміз.","budget":"Баланс, UZS","mine":"Менің балансым","sets":"Дайын жинақтар","popular":"Ең танымал скиндер","total":"Барлығы","left":"Қалады","addAll":"Барлығын себетке","added":"Себетке қосылды","items":"скин","loading":"Таңдалуда…","empty":"Бұл балансқа сәйкес скин табылмады. Соманы көбейтіп көріңіз.","error":"Скиндерді жүктеу мүмкін болмады. Кейінірек қайталап көріңіз.","back":"Баланс бойынша таңдау","budgetLabel":"Баланс","otherSets":"Басқа жинақтар","notFound":"Бұл жинақ қазір табылмады — бағалар өзгерген болуы мүмкін.","names":{"duo":["Екі күшті скин","Баланс екіге бөлінген"],"lead":["Негізгі + қосымша","Бір күшті қару және оған жұп скин"],"kit":["Қару жинағы","Винтовка + снайпер + тапанша"],"premium":["Премиум","Пышақ немесе қолғап + қару"],"trio":["Үш скин","Тең бөлінген 3 скин"],"mix":["Арзан әрі жақсы","Әртүрлі 4–5 танымал скин"],"duo2":["Екі скин (нұсқа)","Басқа танымал жұп"],"kit2":["Қару жинағы (нұсқа)","Басқа винтовка + снайпер + тапанша"],"trio2":["Үш скин (нұсқа)","Басқа танымал үштік"],"lead2":["Негізгі + қосымша (нұсқа)","Басқа күшті жұп"]}};

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
