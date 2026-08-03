// Mahsulotlar ro'yxati. Rasm qo'shish uchun: public/products/ ichiga rasm tashlang
// va image: '/products/nom.jpg' deb yozing. image bo'sh bo'lsa chiroyli placeholder chiqadi.
//
// DIQQAT: Skinlar endi bu faylda emas — ular real vaqtda LIS-SKINS'ning ochiq
// narxlar eksportidan olinadi (lib/lisSkinsFeed.js -> /api/skins va
// /api/skins/[id]). Bu yerda faqat kovriklar va aksessuarlar qoladi.

export const categories = [
  { slug: 'skins', uz: 'Skinlar', ru: 'Скины' },
  { slug: 'kovriklar', uz: 'Kovriklar', ru: 'Коврики' },
  { slug: 'aksessuar', uz: 'Aksessuarlar', ru: 'Аксессуары' },
];

export const products = [
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

// Skin katalogida qurol turi bo'yicha filtrlash uchun (LIS-SKINS'dan kelgan
// weaponType'lar shu slug'lardan biriga to'g'ri keladi)
export const weaponTypes = [
  { slug: 'rifle', uz: 'Vintovka', ru: 'Винтовка' },
  { slug: 'sniper', uz: 'Snayperka', ru: 'Снайперка' },
  { slug: 'pistol', uz: 'Pistolet', ru: 'Пистолет' },
  { slug: 'smg', uz: 'Avtomat (SMG)', ru: 'Пистолет-пулемёт' },
  { slug: 'heavy', uz: "Og'ir qurol", ru: 'Тяжёлое оружие' },
  { slug: 'knife', uz: "Pichoq", ru: 'Нож' },
  { slug: 'gloves', uz: "Qo'lqop", ru: 'Перчатки' },
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
