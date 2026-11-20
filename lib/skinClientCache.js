// Brauzer tomonidagi kichik kesh: skin ma'lumoti va nusxalar ro'yxati.
// Maqsad — variantlarni (FN / MW / FT / StatTrak) almashtirganda sahifa qayta yuklanmasin:
// oldindan yuklangan (prefetch) bo'lsa — almashish oniy.

const TTL_SKIN = 60 * 1000;
const TTL_LISTINGS = 30 * 1000;

const skins = new Map(); // id -> { ts, data }
const skinInflight = new Map();
const lists = new Map(); // id -> { ts, data }
const listInflight = new Map();

function get(map, id, ttl) {
  const h = map.get(id);
  return h && Date.now() - h.ts < ttl ? h.data : null;
}

async function load(url, map, inflight, id) {
  if (inflight.has(id)) return inflight.get(id);
  const p = fetch(url)
    .then(async (r) => {
      if (!r.ok) {
        const err = new Error('http');
        err.status = r.status;
        throw err;
      }
      const data = await r.json();
      map.set(id, { ts: Date.now(), data });
      if (map.size > 60) map.delete(map.keys().next().value);
      return data;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

export const cachedSkin = (id) => get(skins, id, TTL_SKIN);
export const cachedListings = (id) => get(lists, id, TTL_LISTINGS);

export const fetchSkin = (id) => {
  const c = cachedSkin(id);
  return c ? Promise.resolve(c) : load(`/api/skins/${id}`, skins, skinInflight, id);
};
export const fetchListings = (id) => {
  const c = cachedListings(id);
  return c ? Promise.resolve(c) : load(`/api/skins/${id}/listings`, lists, listInflight, id);
};

// niyat bildirilganda (sichqoncha ustiga kelganda) yoki bo'sh vaqtda — jim yuklab qo'yamiz
export const prefetchSkin = (id) => {
  if (!cachedSkin(id)) fetchSkin(id).catch(() => {});
};
export const prefetchListings = (id) => {
  if (!cachedListings(id)) fetchListings(id).catch(() => {});
};
