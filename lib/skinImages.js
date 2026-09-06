// CS2 skinlar uchun metama'lumot (asl Steam rasmi + rariteti + float oralig'i)
// olib beruvchi modul. Bepul, ochiq CSGO-API (github.com/ByMykel/CSGO-API)
// JSON endpoint'idan skinlar ro'yxatini olib, nomi bo'yicha bizning
// mahsulotlarga moslashtiradi (bu STATIK fayl emas — har safar HTTP orqali
// olinadi va 6 soat keshlanadi). Server tomonda (Node) ishlaydi.

const FEED_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 soat

let cache = { map: null, ts: 0 };
let inflight = null;

function normalize(name) {
  return String(name || '')
    .replace(/^★\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function loadMap() {
  if (cache.map && Date.now() - cache.ts < CACHE_TTL) {
    return cache.map;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(FEED_URL, { cache: 'no-store' });
    if (!res.ok) {
      const err = new Error('skin_images_fetch_failed');
      err.status = res.status;
      throw err;
    }
    const list = await res.json();

    const map = new Map();
    for (const item of list) {
      if (!item?.name) continue;
      const key = normalize(item.name);
      // bir xil nomdan bir nechta yozuv bo'lsa, birinchisini saqlaymiz
      if (map.has(key)) continue;
      map.set(key, {
        image: item.image || null,
        rarity: item.rarity?.name || null, // "Covert", "Mil-Spec Grade", ...
        rarityColor: item.rarity?.color || null, // "#eb4b4b"
        minFloat: typeof item.min_float === 'number' ? item.min_float : null,
        maxFloat: typeof item.max_float === 'number' ? item.max_float : null,
      });
    }

    cache = { map, ts: Date.now() };
    return map;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

// names: string[] -> { [name]: imageUrl | null }  (eski API — moslik uchun)
export async function getSkinImages(names) {
  const map = await loadMap();
  const result = {};
  for (const name of names) {
    result[name] = map.get(normalize(name))?.image || null;
  }
  return result;
}

// names: string[] -> { [name]: { image, rarity, rarityColor, minFloat, maxFloat } | null }
export async function getSkinMeta(names) {
  const map = await loadMap();
  const result = {};
  for (const name of names) {
    result[name] = map.get(normalize(name)) || null;
  }
  return result;
}
