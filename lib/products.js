// Mahsulotlar ro'yxati. Rasm qo'shish uchun: public/products/ ichiga rasm tashlang
// va image: '/products/nom.jpg' deb yozing. image bo'sh bo'lsa chiroyli placeholder chiqadi.

export const categories = [
  { slug: 'skins', uz: 'Skinlar', ru: 'Скины' },
  { slug: 'kovriklar', uz: 'Kovriklar', ru: 'Коврики' },
  { slug: 'aksessuar', uz: 'Aksessuarlar', ru: 'Аксессуары' },
];

export const products = [
  // ---------- SKINLAR ----------
  {
    id: 'ak-redline',
    category: 'skins',
    name: 'AK-47 | Redline',
    price: 850000,
    image: '',
    tone: 'from-red-600/30 to-black',
    badge: { uz: 'Field-Tested', ru: 'Field-Tested' },
    short: {
      uz: 'CS2 uchun klassik AK-47 skini. Float 0.18, tez yetkazib berish.',
      ru: 'Классический скин AK-47 для CS2. Float 0.18, быстрая доставка.',
    },
    specs: [
      { uz: 'O\'yin', ru: 'Игра', v: 'CS2' },
      { uz: 'Holati', ru: 'Состояние', v: 'Field-Tested' },
      { uz: 'Float', ru: 'Float', v: '0.18' },
      { uz: 'Yetkazish', ru: 'Доставка', v: '15 min' },
    ],
  },
  {
    id: 'awp-asiimov',
    category: 'skins',
    name: 'AWP | Asiimov',
    price: 1450000,
    image: '',
    tone: 'from-orange-500/30 to-black',
    badge: { uz: 'Hit', ru: 'Хит' },
    short: {
      uz: 'Eng mashhur AWP skini. Trade-lock yo\'q.',
      ru: 'Самый популярный скин AWP. Без trade-lock.',
    },
    specs: [
      { uz: 'O\'yin', ru: 'Игра', v: 'CS2' },
      { uz: 'Holati', ru: 'Состояние', v: 'Well-Worn' },
      { uz: 'Float', ru: 'Float', v: '0.41' },
      { uz: 'Yetkazish', ru: 'Доставка', v: '15 min' },
    ],
  },
  {
    id: 'butterfly-fade',
    category: 'skins',
    name: 'Butterfly Knife | Fade',
    price: 12500000,
    image: '',
    tone: 'from-fuchsia-500/30 to-black',
    badge: { uz: 'Kamyob', ru: 'Редкий' },
    short: {
      uz: '95% fade, Factory New. Kollektsiya uchun eng zo\'r tanlov.',
      ru: '95% fade, Factory New. Лучший выбор для коллекции.',
    },
    specs: [
      { uz: 'O\'yin', ru: 'Игра', v: 'CS2' },
      { uz: 'Holati', ru: 'Состояние', v: 'Factory New' },
      { uz: 'Fade', ru: 'Fade', v: '95%' },
      { uz: 'Yetkazish', ru: 'Доставка', v: '30 min' },
    ],
  },
  {
    id: 'm4a4-howl',
    category: 'skins',
    name: 'M4A4 | Howl',
    price: 28000000,
    image: '',
    tone: 'from-amber-500/30 to-black',
    badge: { uz: 'Contraband', ru: 'Contraband' },
    short: {
      uz: 'Bozordan olib tashlangan afsonaviy skin.',
      ru: 'Легендарный скин, снятый с рынка.',
    },
    specs: [
      { uz: 'O\'yin', ru: 'Игра', v: 'CS2' },
      { uz: 'Holati', ru: 'Состояние', v: 'Minimal Wear' },
      { uz: 'Float', ru: 'Float', v: '0.09' },
      { uz: 'Yetkazish', ru: 'Доставка', v: '1 soat' },
    ],
  },

  // ---------- KOVRIKLAR ----------
  {
    id: 'oxy-darkness',
    category: 'kovriklar',
    name: 'OXY Darkness XL',
    price: 420000,
    image: '/products/kovrik-darkness.jpg',
    images: [
      '/products/kovrik-darkness.jpg',
      '/products/kovrik-darkness-2.jpg',
      '/products/kovrik-darkness-3.jpg',
      '/products/kovrik-darkness-4.jpg',
    ],
    tone: 'from-zinc-500/25 to-black',
    badge: { uz: 'Bestseller', ru: 'Бестселлер' },
    featured: true,
    short: {
      uz: 'Aniqlik va barqarorlikni qadrlaydiganlar uchun. Control sirt, 4 mm asos.',
      ru: 'Для тех, кто ценит точность и стабильность. Control-поверхность, база 4 мм.',
    },
    specs: [
      { uz: 'O\'lcham', ru: 'Размер', v: '900 × 400 mm' },
      { uz: 'Qalinlik', ru: 'Толщина', v: '4 mm' },
      { uz: 'Sirt', ru: 'Поверхность', v: 'Control' },
      { uz: 'Chekka', ru: 'Прошивка', v: 'Anti-fray' },
    ],
  },
  {
    id: 'oxy-speed',
    category: 'kovriklar',
    name: 'OXY Speed L',
    price: 340000,
    image: '/products/kovrik-speed.jpg',
    images: [
      '/products/kovrik-speed.jpg',
      '/products/kovrik-speed-2.jpg',
      '/products/kovrik-speed-3.jpg',
      '/products/kovrik-speed-4.jpg',
    ],
    tone: 'from-cyan-500/25 to-black',
    short: {
      uz: 'Tez glide, past ishqalanish. Aim va flick uchun.',
      ru: 'Быстрый глайд, низкое трение. Для аима и флика.',
    },
    specs: [
      { uz: 'O\'lcham', ru: 'Размер', v: '450 × 400 mm' },
      { uz: 'Qalinlik', ru: 'Толщина', v: '3 mm' },
      { uz: 'Sirt', ru: 'Поверхность', v: 'Speed' },
      { uz: 'Asos', ru: 'База', v: 'Rubber' },
    ],
  },
  {
    id: 'oxy-hybrid',
    category: 'kovriklar',
    name: 'OXY Hybrid XXL',
    price: 520000,
    image: '/products/kovrik-hybrid.jpg',
    images: [
      '/products/kovrik-hybrid.jpg',
      '/products/kovrik-hybrid-2.jpg',
      '/products/kovrik-hybrid-3.jpg',
      '/products/kovrik-hybrid-4.jpg',
    ],
    tone: 'from-emerald-500/25 to-black',
    short: {
      uz: 'Stol ustini to\'liq qoplaydi. Balanslangan sirt.',
      ru: 'Полностью покрывает стол. Сбалансированная поверхность.',
    },
    specs: [
      { uz: 'O\'lcham', ru: 'Размер', v: '1200 × 600 mm' },
      { uz: 'Qalinlik', ru: 'Толщина', v: '4 mm' },
      { uz: 'Sirt', ru: 'Поверхность', v: 'Hybrid' },
      { uz: 'Chekka', ru: 'Прошивка', v: 'Anti-fray' },
    ],
  },

  {
    id: 'oxy-limited',
    category: 'kovriklar',
    name: 'OXY Limited Edition',
    price: 590000,
    image: '/products/kovrik-limited.jpg',
    images: [
      '/products/kovrik-limited.jpg',
      '/products/kovrik-limited-2.jpg',
      '/products/kovrik-limited-3.jpg',
      '/products/kovrik-limited-4.jpg',
    ],
    tone: 'from-fuchsia-500/25 to-black',
    badge: { uz: 'Cheklangan', ru: 'Лимитка' },
    short: {
      uz: 'Cheklangan seriya, raqamlangan. Control sirt, kuchaytirilgan chekka.',
      ru: 'Лимитированная серия с номером. Control-поверхность, усиленная прошивка.',
    },
    specs: [
      { uz: "O'lcham", ru: 'Размер', v: '900 × 400 mm' },
      { uz: 'Qalinlik', ru: 'Толщина', v: '4 mm' },
      { uz: 'Sirt', ru: 'Поверхность', v: 'Control+' },
      { uz: 'Seriya', ru: 'Серия', v: '/300' },
    ],
  },

  // ---------- AKSESSUARLAR ----------
  {
    id: 'oxy-mouse-pro',
    category: 'aksessuar',
    name: 'OXY Mouse Pro Wireless',
    price: 1250000,
    image: '',
    tone: 'from-indigo-500/25 to-black',
    short: {
      uz: '58 g, 26 000 DPI sensor, 1000 Hz. Web-drayver bilan sozlanadi.',
      ru: '58 г, сенсор 26 000 DPI, 1000 Гц. Настраивается через веб-драйвер.',
    },
    specs: [
      { uz: 'Vazn', ru: 'Вес', v: '58 g' },
      { uz: 'Sensor', ru: 'Сенсор', v: '26 000 DPI' },
      { uz: 'Ulanish', ru: 'Подключение', v: '2.4 GHz / USB-C' },
      { uz: 'Batareya', ru: 'Батарея', v: '70 soat' },
    ],
  },
  {
    id: 'oxy-glides',
    category: 'aksessuar',
    name: 'OXY PTFE Glides',
    price: 90000,
    image: '',
    tone: 'from-sky-500/25 to-black',
    short: {
      uz: '100% PTFE oyoqchalar. Silliq va bir tekis glide.',
      ru: '100% PTFE ножки. Плавный и ровный глайд.',
    },
    specs: [
      { uz: 'Material', ru: 'Материал', v: 'PTFE 0.8 mm' },
      { uz: 'To\'plam', ru: 'Комплект', v: '2 set' },
    ],
  },
  {
    id: 'oxy-grip',
    category: 'aksessuar',
    name: 'OXY Grip Tape',
    price: 75000,
    image: '',
    tone: 'from-rose-500/25 to-black',
    short: {
      uz: 'Terlaganda ham sirpanmaydi. Har qanday mishkaga mos.',
      ru: 'Не скользит даже во влажной руке. Подходит под любую мышь.',
    },
    specs: [
      { uz: 'Material', ru: 'Материал', v: 'Anti-slip' },
      { uz: 'Qalinlik', ru: 'Толщина', v: '0.5 mm' },
    ],
  },
];

export function getProduct(id) {
  return products.find((p) => p.id === id);
}

export function byCategory(slug) {
  return products.filter((p) => p.category === slug);
}

export function formatPrice(v) {
  return new Intl.NumberFormat('ru-RU').format(v) + ' so\'m';
}
