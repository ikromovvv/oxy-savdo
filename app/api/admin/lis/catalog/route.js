import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/adminAuth';
import { fetchLisShortList } from '@/lib/lisCatalog';
import { queryLisList } from '@/lib/lisAdminCatalog';
import { getSkinMeta } from '@/lib/skinImages';
import { getFavorites } from '@/lib/lisFavorites';

export const dynamic = 'force-dynamic';

// GET /api/admin/lis/catalog — LIS-SKINS katalogi (admin uchun): filtr, saralash, sahifalash.
// Query: query, weaponType, wear, rarity, availability, priceFrom, priceTo, sort, page
export async function GET(req) {
  const admin = currentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const filters = {
    query: sp.get('query') || '',
    weaponType: sp.get('weaponType') || 'all',
    wear: sp.get('wear') || 'all',
    rarity: sp.get('rarity') || 'all',
    availability: sp.get('availability') || 'all',
    priceFrom: sp.get('priceFrom') || '',
    priceTo: sp.get('priceTo') || '',
    sort: sp.get('sort') || 'price_desc',
    color: sp.get('color') || '',
    page: sp.get('page') || 1,
  };

  try {
    let list = await fetchLisShortList();
    if (sp.get('fav') === '1') {
      const favs = new Set(await getFavorites(admin.id));
      list = list.filter((e) => favs.has(e?.name));
    }

    // rariteti filtri uchun barcha nomlarning meta'si kerak (kod ichidagi ma'lumot — tez)
    let rarityOf;
    if (filters.rarity !== 'all') {
      const names = [...new Set(list.map((e) => String(e?.name || '').replace(/^StatTrak™ /, '').replace(/^Souvenir /, '').replace(/ \([^)]+\)$/, '')))];
      const meta = await getSkinMeta(names).catch(() => ({}));
      rarityOf = (base) => meta[base]?.rarity || null;
    }

    const res = queryLisList(list, filters, { rarityOf });

    // faqat sahifadagi kartalar uchun rasm / rariteti
    const meta = await getSkinMeta([...new Set(res.items.map((i) => i.baseName))]).catch(() => ({}));
    const items = res.items.map((i) => {
      const m = meta[i.baseName] || {};
      return { ...i, image: m.image || null, rarity: m.rarity || null, rarityColor: m.rarityColor || null };
    });

    const usdUzs = Number(process.env.USD_UZS) || 12700;
    return NextResponse.json({ ...res, items, usdUzs });
  } catch (e) {
    console.error('[api/admin/lis/catalog]', e?.code || e?.message || e);
    return NextResponse.json({ error: e?.code || 'fetch_failed', status: e?.status || null, detail: e?.detail || e?.message || null }, { status: 502 });
  }
}
