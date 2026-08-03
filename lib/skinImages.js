// CS2 skinlar uchun asl Steam rasm manzillarini olib beruvchi modul.
// Bepul, ochiq CSGO-API (github.com/ByMykel/CSGO-API) loyihasidan skinlar
// ro'yxatini olib, nomi bo'yicha bizning mahsulotlarga moslashtiradi.
// Bu server tomonda (Node) ishlaydi — hajmi ~5 MB bo'lgani uchun brauzerda
// emas, shu yerda bir marta yuklab, xotirada keshlaymiz.

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
      if (!item?.name || !item?.image) continue;
      const key = normalize(item.name);
      // bir xil nomdan bir nechta yozuv bo'lsa, birinchisini saqlaymiz
      if (!map.has(key)) map.set(key, item.image);
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

// names: string[] -> { [name]: imageUrl | null }
export async function getSkinImages(names) {
  const map = await loadMap();
  const result = {};
  for (const name of names) {
    result[name] = map.get(normalize(name)) || null;
  }
  return result;
}
