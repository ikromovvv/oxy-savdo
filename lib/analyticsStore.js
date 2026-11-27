// Tashrif statistikasi (anonim): kim kirdi, necha marta, hozir kim onlayn.
//   DATABASE_URL bo'lsa Postgres (oxy.visitors, oxy.visit_days), bo'lmasa data/analytics.json.
// Shaxsiy ma'lumot saqlanmaydi: faqat tasodifiy brauzer ID (vid) va, kirgan bo'lsa, steamid.
// Kunlar Toshkent vaqti (UTC+5) bo'yicha.

import { promises as fs } from 'fs';
import path from 'path';
import { db, dbEnabled } from './db';
import { ensureMigrations } from './orderStore';

const LOCAL_FILE = path.join(process.cwd(), 'data', 'analytics.json');
const TZ_OFFSET_MS = 5 * 3600 * 1000;
const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // "hozir onlayn" = oxirgi 5 daqiqa

export const dayKey = (ms) => new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
const VID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget|python-requests/i;

export const isBot = (ua) => BOT_RE.test(String(ua || ''));
export const validVid = (v) => VID_RE.test(String(v || ''));

// ---------- fayl rejimi ----------
async function readLocal() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8'));
  } catch {
    return { visitors: {}, days: {} };
  }
}
let _lock = Promise.resolve();
function withLocal(fn) {
  const run = async () => {
    const data = await readLocal();
    const out = await fn(data);
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(data), 'utf8');
    return out;
  };
  const p = _lock.then(run, run);
  _lock = p.catch(() => {});
  return p;
}

// ---------- yozish ----------

// hb = true -> faqat "tirikman" signali (hisobga tashrif sifatida qo'shilmaydi)
export async function recordVisit({ vid, steamid = null, hb = false, now = Date.now() }) {
  if (!validVid(vid)) return false;
  const day = dayKey(now);

  if (!dbEnabled) {
    await withLocal((data) => {
      const v = data.visitors[vid] || { first: now, last: now, steamid: null, hits: 0 };
      v.last = now;
      if (steamid) v.steamid = String(steamid);
      if (!hb) v.hits += 1;
      data.visitors[vid] = v;
      data.days[day] = data.days[day] || {};
      data.days[day][vid] = (data.days[day][vid] || 0) + (hb ? 0 : 1);
    });
    return true;
  }

  await ensureMigrations();
  const sql = db();
  const sid = steamid ? String(steamid) : null;
  await sql`
    insert into oxy.visitors (vid, steamid, first_seen, last_seen, hits)
    values (${vid}, ${sid}, to_timestamp(${now / 1000}), to_timestamp(${now / 1000}), ${hb ? 0 : 1})
    on conflict (vid) do update set
      last_seen = excluded.last_seen,
      steamid = coalesce(excluded.steamid, oxy.visitors.steamid),
      hits = oxy.visitors.hits + ${hb ? 0 : 1}
  `;
  await sql`
    insert into oxy.visit_days (day, vid, hits) values (${day}::date, ${vid}, ${hb ? 0 : 1})
    on conflict (day, vid) do update set hits = oxy.visit_days.hits + ${hb ? 0 : 1}
  `;
  return true;
}

// ---------- o'qish: tashriflar ----------

function lastDays(n, now) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(now - i * 86400000));
  return out;
}

export async function getTrafficStats({ now = Date.now() } = {}) {
  const days30 = lastDays(30, now);
  const today = dayKey(now);
  const d7 = new Set(lastDays(7, now));

  let visitors; // [{vid, first, last, steamid, hits}]
  let perDay; // { 'YYYY-MM-DD': { vid: hits } }

  if (!dbEnabled) {
    const data = await readLocal();
    visitors = Object.entries(data.visitors).map(([vid, v]) => ({ vid, ...v }));
    perDay = data.days;
  } else {
    await ensureMigrations();
    const sql = db();
    const vrows = await sql`select vid, steamid, first_seen, last_seen, hits from oxy.visitors`;
    visitors = vrows.map((r) => ({
      vid: r.vid,
      steamid: r.steamid,
      first: new Date(r.first_seen).getTime(),
      last: new Date(r.last_seen).getTime(),
      hits: Number(r.hits),
    }));
    const drows = await sql`
      select to_char(day, 'YYYY-MM-DD') as day, vid, hits from oxy.visit_days where day >= ${days30[0]}::date
    `;
    perDay = {};
    for (const r of drows) (perDay[r.day] = perDay[r.day] || {})[r.vid] = Number(r.hits);
  }

  const series = days30.map((d) => {
    const m = perDay[d] || {};
    return { d, visitors: Object.keys(m).length, hits: Object.values(m).reduce((s, n) => s + n, 0) };
  });
  const uniq = (set) => {
    const u = new Set();
    for (const d of set) for (const vid of Object.keys(perDay[d] || {})) u.add(vid);
    return u.size;
  };

  const activeNow = visitors.filter((v) => now - v.last <= ACTIVE_WINDOW_MS).length;
  const active24h = visitors.filter((v) => now - v.last <= 86400000).length;
  const newToday = visitors.filter((v) => dayKey(v.first) === today).length;
  const todayRow = series[series.length - 1];

  return {
    activeNow,
    active24h,
    today: { visitors: todayRow.visitors, hits: todayRow.hits, newVisitors: newToday },
    unique7d: uniq(d7),
    unique30d: uniq(new Set(days30)),
    totalVisitors: visitors.length,
    totalHits: visitors.reduce((s, v) => s + v.hits, 0),
    series,
    trackingSince: visitors.length ? Math.min(...visitors.map((v) => v.first)) : null,
  };
}

// ---------- o'qish: foydalanuvchilar va balans ----------

export async function getUserStats({ now = Date.now() } = {}) {
  const days30 = lastDays(30, now);
  const today = dayKey(now);

  // Steam orqali kirganlar (tashrif kuzatuvidan)
  let logged; // [{steamid, last}]
  if (!dbEnabled) {
    const data = await readLocal();
    logged = Object.values(data.visitors).filter((v) => v.steamid).map((v) => ({ steamid: v.steamid, last: v.last }));
  } else {
    await ensureMigrations();
    const sql = db();
    const rows = await sql`select steamid, last_seen from oxy.visitors where steamid is not null`;
    logged = rows.map((r) => ({ steamid: r.steamid, last: new Date(r.last_seen).getTime() }));
  }
  // bir steamid ko'p brauzerdan kirgan bo'lishi mumkin -> eng yangi tashrif
  const bySteam = new Map();
  for (const l of logged) bySteam.set(l.steamid, Math.max(bySteam.get(l.steamid) || 0, l.last));
  const lastSeen = [...bySteam.values()];

  // Hamyon va to'ldirishlar (demo pul hisobga olinmaydi)
  let wallets = { count: 0, total: 0 };
  let deposits = []; // [{steamid, amount, at}]
  if (!dbEnabled) {
    const data = await readWallets();
    for (const [sid, v] of Object.entries(data.wallets || {})) {
      if (sid.startsWith('demo:')) continue;
      wallets.count += 1;
      wallets.total += Number(v.balance || 0);
    }
    deposits = (data.txns || [])
      .filter((t) => t.kind === 'deposit' && !String(t.steamid).startsWith('demo:'))
      .map((t) => ({ steamid: t.steamid, amount: Number(t.amount), at: t.at }));
  } else {
    const sql = db();
    const [w] = await sql`
      select count(*)::int as count, coalesce(sum(balance), 0) as total
      from oxy.wallets where steamid not like 'demo:%'
    `;
    wallets = { count: Number(w.count), total: Number(w.total) };
    const rows = await sql`
      select steamid, amount, created_at from oxy.wallet_txns
      where kind = 'deposit' and steamid not like 'demo:%'
    `;
    deposits = rows.map((r) => ({ steamid: r.steamid, amount: Number(r.amount), at: new Date(r.created_at).getTime() }));
  }

  const inDays = (set) => deposits.filter((d) => set.has(dayKey(d.at)));
  const sumOf = (list) => list.reduce((s, d) => s + d.amount, 0);
  const usersOf = (list) => new Set(list.map((d) => d.steamid)).size;
  const d7 = new Set(lastDays(7, now));
  const d30 = new Set(days30);
  const dToday = new Set([today]);
  const pack = (list) => ({ count: list.length, sum: sumOf(list), users: usersOf(list) });

  const series = days30.map((d) => {
    const list = deposits.filter((x) => dayKey(x.at) === d);
    return { d, count: list.length, sum: sumOf(list) };
  });

  return {
    loggedIn: {
      total: bySteam.size,
      activeNow: lastSeen.filter((t) => now - t <= ACTIVE_WINDOW_MS).length,
      active24h: lastSeen.filter((t) => now - t <= 86400000).length,
      active7d: lastSeen.filter((t) => now - t <= 7 * 86400000).length,
    },
    wallets,
    deposits: {
      all: pack(deposits),
      today: pack(inDays(dToday)),
      d7: pack(inDays(d7)),
      d30: pack(inDays(d30)),
    },
    series,
  };
}

async function readWallets() {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'wallets.json'), 'utf8'));
  } catch {
    return { wallets: {}, txns: [] };
  }
}
