// Admin statistikasi: Telegram e'lonlar va sayt savdosi (server tomonda hisoblanadi).
import { listPosts, getLastSync } from './tgStore';
import { listOrders } from './orderStore';
import { dayKey } from './analyticsStore';

const PAID_STATUSES = ['paid', 'fulfilling', 'sent', 'done'];

// Haqiqiy pul tushgan buyurtma (balans to'ldirish va demo/sinov hisobga olinmaydi)
export function isPaidOrder(o) {
  if (o.status === 'refunded' || o.status === 'cancelled') return false;
  if (o.items?.some((i) => i.kind === 'deposit')) return false;
  if (['wallet-demo', 'demo', 'test'].includes(o.payment?.provider)) return false;
  return o.payment?.status === 'paid' || PAID_STATUSES.includes(o.status);
}

const sum = (list, f) => list.reduce((s, x) => s + (Number(f(x)) || 0), 0);

// ---------- Telegram kanal skinlari ----------
export async function getTelegramStats() {
  const posts = await listPosts({ statuses: ['available', 'sold'], limit: 20000 });
  const available = posts.filter((p) => p.status === 'available');
  const sold = posts.filter((p) => p.status === 'sold');
  const priced = (l) => l.filter((p) => p.priceUzs > 0);

  const byQuality = {};
  for (const p of available) byQuality[p.quality || '—'] = (byQuality[p.quality || '—'] || 0) + 1;

  const av = priced(available);
  const slim = (p) => ({ id: p.id, name: p.name, quality: p.quality, stattrak: p.stattrak, priceUzs: p.priceUzs, postedAt: p.postedAt });

  return {
    available: {
      count: available.length,
      withPrice: av.length,
      totalValue: sum(av, (p) => p.priceUzs),
      avgPrice: av.length ? Math.round(sum(av, (p) => p.priceUzs) / av.length) : 0,
      minPrice: av.length ? Math.min(...av.map((p) => p.priceUzs)) : 0,
      maxPrice: av.length ? Math.max(...av.map((p) => p.priceUzs)) : 0,
    },
    sold: {
      count: sold.length,
      totalValue: sum(priced(sold), (p) => p.priceUzs),
    },
    byQuality,
    stattrak: available.filter((p) => p.stattrak).length,
    noBan: available.filter((p) => p.noBan).length,
    topAvailable: [...av].sort((a, b) => b.priceUzs - a.priceUzs).slice(0, 10).map(slim),
    recentSold: [...sold].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10).map((p) => ({ ...slim(p), soldAt: p.updatedAt })),
    lastSync: await getLastSync().catch(() => 0),
  };
}

// ---------- Sayt savdosi (buyurtmalar) ----------
export async function getSalesStats({ now = Date.now() } = {}) {
  const all = await listOrders({});
  const paid = all.filter(isPaidOrder);
  const goods = (o) => (o.items || []).filter((i) => i.kind !== 'deposit');
  const qty = (o, pred) => sum(goods(o).filter(pred), (i) => i.qty || 1);
  const isSkin = (i) => i.kind === 'skin' || i.kind === 'tgskin';

  const since = (days) => now - days * 86400000;
  const startOfToday = new Date(dayKey(now) + 'T00:00:00+05:00').getTime();
  const pack = (list) => ({
    orders: list.length,
    revenue: sum(list, (o) => o.total),
    skins: sum(list, (o) => qty(o, isSkin)),
    other: sum(list, (o) => qty(o, (i) => !isSkin(i))),
  });

  const series = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayKey(now - i * 86400000);
    const list = paid.filter((o) => dayKey(o.createdAt) === d);
    series.push({ d, orders: list.length, revenue: sum(list, (o) => o.total) });
  }

  const statusCounts = {};
  for (const o of all) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  return {
    today: pack(paid.filter((o) => o.createdAt >= startOfToday)),
    d7: pack(paid.filter((o) => o.createdAt >= since(7))),
    d30: pack(paid.filter((o) => o.createdAt >= since(30))),
    all: pack(paid),
    totalOrders: all.length,
    pending: all.filter((o) => o.status === 'new' || o.status === 'pending' || o.payment?.status === 'pending').length,
    failed: all.filter((o) => o.fulfillment?.status === 'error').length,
    buyers: new Set(paid.map((o) => o.steam?.steamid || o.customer?.phone || o.id)).size,
    statusCounts,
    series,
  };
}
