'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@/lib/products';
import { Icon, Svg } from './ui';

const n = (v) => Number(v || 0).toLocaleString('ru-RU');
const money = (v) => formatPrice(Number(v || 0));
const when = (ts) => {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

function Stat({ label, value, sub, accent, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`card p-4 text-left ${onClick ? 'transition hover:border-white/30' : ''}`}>
      <div className="label">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold tracking-tight ${accent ? 'text-accent' : ''}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Tag>
  );
}

function Block({ title, children, right }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-white/80">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const Grid = ({ children, cols = 'lg:grid-cols-4' }) => <div className={`grid grid-cols-2 gap-3 ${cols}`}>{children}</div>;

// Oddiy ustunli grafik (kunlik seriya)
function Bars({ data, valueKey, label, fmt = n }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="card p-4">
      <div className="flex h-36 items-end gap-1">
        {data.map((d) => (
          <div key={d.d} className="group relative flex h-full flex-1 items-end" title={`${d.d}: ${fmt(d[valueKey])}`}>
            <div
              className="w-full rounded-t bg-accent/70 transition group-hover:bg-accent"
              style={{ height: `${Math.max(2, (d[valueKey] / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>{data[0]?.d.slice(5)}</span>
        <span>{label}</span>
        <span>{data[data.length - 1]?.d.slice(5)}</span>
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="card p-6 text-sm text-muted">{children}</div>;
}

// ---------------- bo'limlar ----------------

function Overview({ d, onGo }) {
  const { tg, sales, traffic, users } = d;
  return (
    <>
      <Block title="Sayt">
        <Grid>
          <Stat label="Hozir onlayn" value={n(traffic?.activeNow)} sub="oxirgi 5 daqiqa" accent onClick={() => onGo('stat_traffic')} />
          <Stat label="Bugun kirganlar" value={n(traffic?.today.visitors)} sub={`${n(traffic?.today.hits)} ta tashrif`} onClick={() => onGo('stat_traffic')} />
          <Stat label="30 kunda kirganlar" value={n(traffic?.unique30d)} sub={`jami ${n(traffic?.totalVisitors)}`} onClick={() => onGo('stat_traffic')} />
          <Stat label="Steam bilan kirganlar" value={n(users?.loggedIn.total)} sub={`24 soatda ${n(users?.loggedIn.active24h)} faol`} onClick={() => onGo('stat_users')} />
        </Grid>
      </Block>

      <Block title="Telegram skinlar">
        <Grid>
          <Stat label="Mavjud skinlar" value={n(tg?.available.count)} sub={`${n(tg?.available.withPrice)} tasida narx bor`} accent onClick={() => onGo('stat_tg')} />
          <Stat label="Mavjudlar qiymati" value={money(tg?.available.totalValue)} sub={`o'rtacha ${money(tg?.available.avgPrice)}`} onClick={() => onGo('stat_tg')} />
          <Stat label="Sotilgan" value={n(tg?.sold.count)} sub={money(tg?.sold.totalValue)} onClick={() => onGo('stat_tg')} />
          <Stat label="Eng qimmati" value={money(tg?.available.maxPrice)} sub={`eng arzoni ${money(tg?.available.minPrice)}`} onClick={() => onGo('stat_tg')} />
        </Grid>
      </Block>

      <Block title="Sayt savdosi va balans">
        <Grid>
          <Stat label="Bugungi savdo" value={money(sales?.today.revenue)} sub={`${n(sales?.today.orders)} ta buyurtma`} onClick={() => onGo('stat_sales')} />
          <Stat label="30 kunlik savdo" value={money(sales?.d30.revenue)} sub={`${n(sales?.d30.skins)} ta skin sotildi`} onClick={() => onGo('stat_sales')} />
          <Stat label="Balans to'ldirdi (30 kun)" value={money(users?.deposits.d30.sum)} sub={`${n(users?.deposits.d30.users)} kishi`} onClick={() => onGo('stat_users')} />
          <Stat label="Hamyonlardagi pul" value={money(users?.wallets.total)} sub={`${n(users?.wallets.count)} ta hamyon`} onClick={() => onGo('stat_users')} />
        </Grid>
      </Block>
    </>
  );
}

function Telegram({ d }) {
  const q = Object.entries(d.byQuality).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <Grid>
        <Stat label="Mavjud skinlar" value={n(d.available.count)} sub={`${n(d.available.withPrice)} tasida narx bor`} accent />
        <Stat label="Mavjudlar qiymati" value={money(d.available.totalValue)} sub="narxi yozilganlar yig'indisi" />
        <Stat label="O'rtacha narx" value={money(d.available.avgPrice)} sub={`${money(d.available.minPrice)} – ${money(d.available.maxPrice)}`} />
        <Stat label="Sotilgan" value={n(d.sold.count)} sub={money(d.sold.totalValue)} />
      </Grid>

      <Block title="Holat bo'yicha (mavjudlar)">
        <div className="card flex flex-wrap gap-2 p-4">
          {q.length === 0 && <span className="text-sm text-muted">Ma'lumot yo'q</span>}
          {q.map(([k, c]) => (
            <span key={k} className="rounded-lg border border-line px-3 py-1.5 text-sm">
              <b>{k}</b> <span className="text-muted">· {n(c)}</span>
            </span>
          ))}
          <span className="rounded-lg border border-line px-3 py-1.5 text-sm">StatTrak <span className="text-muted">· {n(d.stattrak)}</span></span>
          <span className="rounded-lg border border-line px-3 py-1.5 text-sm">No-ban <span className="text-muted">· {n(d.noBan)}</span></span>
        </div>
      </Block>

      <Block title="Eng qimmat 10 ta mavjud skin">
        <List rows={d.topAvailable} cols={(r) => [r.name + (r.stattrak ? ' (ST)' : ''), r.quality || '—', money(r.priceUzs), when(r.postedAt)]} head={['Nomi', 'Holat', 'Narx', "E'lon vaqti"]} />
      </Block>

      <Block title="Oxirgi sotilganlar">
        <List rows={d.recentSold} cols={(r) => [r.name + (r.stattrak ? ' (ST)' : ''), r.quality || '—', money(r.priceUzs), when(r.soldAt)]} head={['Nomi', 'Holat', 'Narx', 'Sotilgan vaqti']} />
      </Block>

      <p className="mt-4 text-xs text-muted">Kanal oxirgi yangilangan: {when(d.lastSync)}</p>
    </>
  );
}

function List({ rows, head, cols }) {
  if (!rows?.length) return <Empty>Hozircha ma'lumot yo'q.</Empty>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0">
              {cols(r).map((c, i) => (
                <td key={i} className="px-4 py-2.5">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sales({ d }) {
  const row = (label, p) => (
    <tr key={label} className="border-b border-line/60 last:border-0">
      <td className="px-4 py-2.5 text-muted">{label}</td>
      <td className="px-4 py-2.5">{n(p.orders)}</td>
      <td className="px-4 py-2.5">{n(p.skins)}</td>
      <td className="px-4 py-2.5">{n(p.other)}</td>
      <td className="px-4 py-2.5 font-semibold">{money(p.revenue)}</td>
    </tr>
  );
  return (
    <>
      <Grid>
        <Stat label="Bugun" value={money(d.today.revenue)} sub={`${n(d.today.orders)} ta buyurtma`} accent />
        <Stat label="7 kun" value={money(d.d7.revenue)} sub={`${n(d.d7.orders)} ta buyurtma`} />
        <Stat label="30 kun" value={money(d.d30.revenue)} sub={`${n(d.d30.orders)} ta buyurtma`} />
        <Stat label="Jami" value={money(d.all.revenue)} sub={`${n(d.buyers)} ta xaridor`} />
      </Grid>
      <Block title="Savdo (to'langan buyurtmalar)">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Davr</th><th className="px-4 py-2.5 font-medium">Buyurtma</th>
                <th className="px-4 py-2.5 font-medium">Skin</th><th className="px-4 py-2.5 font-medium">Boshqa</th><th className="px-4 py-2.5 font-medium">Tushum</th>
              </tr>
            </thead>
            <tbody>{row('Bugun', d.today)}{row('7 kun', d.d7)}{row('30 kun', d.d30)}{row('Jami', d.all)}</tbody>
          </table>
        </div>
      </Block>
      <Block title="Kunlik tushum (30 kun)"><Bars data={d.series} valueKey="revenue" label="so'm" fmt={money} /></Block>
      <Block title="Holatlar">
        <div className="card flex flex-wrap gap-2 p-4">
          <span className="rounded-lg border border-line px-3 py-1.5 text-sm">Jami buyurtma <span className="text-muted">· {n(d.totalOrders)}</span></span>
          <span className="rounded-lg border border-line px-3 py-1.5 text-sm">To'lov kutilmoqda <span className="text-muted">· {n(d.pending)}</span></span>
          <span className="rounded-lg border border-line px-3 py-1.5 text-sm">Yetkazishda xato <span className="text-muted">· {n(d.failed)}</span></span>
        </div>
      </Block>
    </>
  );
}

function Traffic({ d }) {
  return (
    <>
      <Grid>
        <Stat label="Hozir onlayn" value={n(d.activeNow)} sub="oxirgi 5 daqiqada" accent />
        <Stat label="24 soatda faol" value={n(d.active24h)} sub="kamida bir marta kirgan" />
        <Stat label="Bugun kirganlar" value={n(d.today.visitors)} sub={`${n(d.today.newVisitors)} tasi yangi`} />
        <Stat label="Bugungi tashriflar" value={n(d.today.hits)} sub="sahifa ochilishlari" />
        <Stat label="7 kunda" value={n(d.unique7d)} sub="noyob tashrifchi" />
        <Stat label="30 kunda" value={n(d.unique30d)} sub="noyob tashrifchi" />
        <Stat label="Jami tashrifchi" value={n(d.totalVisitors)} sub="kuzatuv boshlangandan beri" />
        <Stat label="Jami tashrif" value={n(d.totalHits)} sub={d.trackingSince ? `${when(d.trackingSince)} dan` : ''} />
      </Grid>
      <Block title="Kunlik noyob tashrifchilar (30 kun)"><Bars data={d.series} valueKey="visitors" label="kishi" /></Block>
      <Block title="Kunlik tashriflar (30 kun)"><Bars data={d.series} valueKey="hits" label="tashrif" /></Block>
      <p className="mt-4 text-xs text-muted">Tashrifchi = brauzer (anonim ID). Botlar hisobga olinmaydi. Kun Toshkent vaqti bilan.</p>
    </>
  );
}

function Users({ d }) {
  const dep = (label, p) => (
    <tr key={label} className="border-b border-line/60 last:border-0">
      <td className="px-4 py-2.5 text-muted">{label}</td>
      <td className="px-4 py-2.5">{n(p.users)}</td>
      <td className="px-4 py-2.5">{n(p.count)}</td>
      <td className="px-4 py-2.5 font-semibold">{money(p.sum)}</td>
    </tr>
  );
  return (
    <>
      <Block title="Steam orqali kirganlar">
        <Grid>
          <Stat label="Jami kirgan" value={n(d.loggedIn.total)} sub="kuzatuv boshlangandan beri" accent />
          <Stat label="Hozir faol" value={n(d.loggedIn.activeNow)} sub="oxirgi 5 daqiqa" />
          <Stat label="24 soatda faol" value={n(d.loggedIn.active24h)} />
          <Stat label="7 kunda faol" value={n(d.loggedIn.active7d)} />
        </Grid>
      </Block>

      <Block title="Balans va to'ldirishlar">
        <Grid>
          <Stat label="Hamyonlar" value={n(d.wallets.count)} sub="balansi bor foydalanuvchilar" />
          <Stat label="Hamyonlardagi pul" value={money(d.wallets.total)} />
          <Stat label="Jami to'ldirgan" value={n(d.deposits.all.users)} sub={`${n(d.deposits.all.count)} ta to'ldirish`} accent />
          <Stat label="To'ldirilgan summa" value={money(d.deposits.all.sum)} />
        </Grid>
        <div className="card mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Davr</th><th className="px-4 py-2.5 font-medium">Kishi</th>
                <th className="px-4 py-2.5 font-medium">To'ldirish</th><th className="px-4 py-2.5 font-medium">Summa</th>
              </tr>
            </thead>
            <tbody>{dep('Bugun', d.deposits.today)}{dep('7 kun', d.deposits.d7)}{dep('30 kun', d.deposits.d30)}{dep('Jami', d.deposits.all)}</tbody>
          </table>
        </div>
      </Block>

      <Block title="Kunlik to'ldirishlar (30 kun)"><Bars data={d.series} valueKey="sum" label="so'm" fmt={money} /></Block>
      <p className="mt-4 text-xs text-muted">Demo (sinov) pullar hisobga olinmaydi.</p>
    </>
  );
}

const TITLES = {
  stat_overview: 'Umumiy ko\'rinish',
  stat_tg: 'Telegram skinlar',
  stat_sales: 'Sayt savdosi',
  stat_traffic: 'Tashrifchilar',
  stat_users: 'Foydalanuvchilar va balans',
};
const SECTION = { stat_overview: 'overview', stat_tg: 'telegram', stat_sales: 'sales', stat_traffic: 'traffic', stat_users: 'users' };
export const STAT_VIEWS = Object.keys(TITLES);
export const statTitle = (view) => TITLES[view];

export default function AdminStats({ view, onGo }) {
  const section = SECTION[view] || 'overview';
  // natija qaysi bo'limga tegishli ekani saqlanadi: bo'lim almashganda eski bo'lim ma'lumoti chizilmasin
  const [res, setRes] = useState(null);
  const data = res && res.section === section ? res.d : null;
  const [err, setErr] = useState('');
  const [updated, setUpdated] = useState(0);

  const load = useCallback(() => {
    fetch(`/api/admin/analytics?section=${section}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http_' + r.status))))
      .then((d) => {
        setRes({ section, d });
        setErr('');
        setUpdated(Date.now());
      })
      .catch(() => setErr("Ma'lumotni yuklab bo'lmadi"));
  }, [section]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // jonli: har 30 soniyada yangilanadi
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{updated ? `Yangilandi: ${new Date(updated).toLocaleTimeString('ru-RU')}` : ''}</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-white/75 hover:text-white">
          <Svg d={Icon.refresh} className="h-3.5 w-3.5" /> Yangilash
        </button>
      </div>
      {err && <Empty>{err}</Empty>}
      {!err && !data && <Empty>Yuklanmoqda…</Empty>}
      {data && !err && (
        <>
          {view === 'stat_overview' && <Overview d={data} onGo={onGo} />}
          {view === 'stat_tg' && <Telegram d={data} />}
          {view === 'stat_sales' && <Sales d={data} />}
          {view === 'stat_traffic' && <Traffic d={data} />}
          {view === 'stat_users' && <Users d={data} />}
        </>
      )}
    </div>
  );
}
