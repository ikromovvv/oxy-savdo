// Telegram kanal e'lonlari saqlash qatlami.
//   DATABASE_URL bo'lsa Postgres (oxy.tg_posts), bo'lmasa data/tgposts.json.
// Postlar `id = "kanal/xabar_id"` bilan upsert qilinadi, shuning uchun webhook ham,
// ochiq sahifadan o'qish ham bir xil qatorni yangilaydi (takrorlanish bo'lmaydi).

import { promises as fs } from 'fs';
import path from 'path';
import { db, dbEnabled } from './db';
import { ensureMigrations } from './orderStore';

const LOCAL_FILE = path.join(process.cwd(), 'data', 'tgposts.json');
const META_ID = '_sync';

function fromRow(r) {
  return {
    id: r.id,
    channel: r.channel,
    msgId: Number(r.msg_id),
    postedAt: new Date(r.posted_at).getTime(),
    rawText: r.raw_text || '',
    name: r.name,
    stattrak: Boolean(r.stattrak),
    souvenir: Boolean(r.souvenir),
    quality: r.quality || null,
    float: r.float_value == null ? null : Number(r.float_value),
    priceUzs: r.price_uzs == null ? null : Number(r.price_uzs),
    priceUsd: r.price_usd == null ? null : Number(r.price_usd),
    priceRaw: r.price_raw || null,
    status: r.status,
    unban: r.unban || null,
    noBan: Boolean(r.no_ban),
    contact: r.contact || null,
    imageUrl: r.image_url || null,
    fileId: r.file_id || null,
    source: r.source || null,
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

// ---------- fayl rejimi ----------

async function readLocal() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8'));
  } catch {
    return { posts: {}, lastSync: 0 };
  }
}
async function writeLocal(data) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ---------- ochiq API ----------

// rows: [{ id, channel, msgId, postedAt, rawText, name, ..., imageUrl?, fileId?, source }]
export async function upsertPosts(rows) {
  if (!rows?.length) return 0;
  if (!dbEnabled) {
    const data = await readLocal();
    for (const r of rows) {
      const old = data.posts[r.id] || {};
      data.posts[r.id] = {
        ...old,
        ...r,
        imageUrl: r.imageUrl || old.imageUrl || null,
        fileId: r.fileId || old.fileId || null,
        updatedAt: Date.now(),
      };
    }
    await writeLocal(data);
    return rows.length;
  }

  await ensureMigrations();
  const sql = db();
  await sql.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        insert into oxy.tg_posts
          (id, channel, msg_id, posted_at, raw_text, name, stattrak, souvenir, quality, float_value,
           price_uzs, price_usd, price_raw, status, unban, no_ban, contact, image_url, file_id, source, updated_at)
        values (
          ${r.id}, ${r.channel}, ${r.msgId}, to_timestamp(${r.postedAt} / 1000.0), ${r.rawText || ''},
          ${r.name}, ${Boolean(r.stattrak)}, ${Boolean(r.souvenir)}, ${r.quality || null}, ${r.float ?? null},
          ${r.priceUzs ?? null}, ${r.priceUsd ?? null}, ${r.priceRaw || null}, ${r.status}, ${r.unban || null},
          ${Boolean(r.noBan)}, ${r.contact || null}, ${r.imageUrl || null}, ${r.fileId || null}, ${r.source || null}, now()
        )
        on conflict (id) do update set
          raw_text = excluded.raw_text, name = excluded.name, stattrak = excluded.stattrak,
          souvenir = excluded.souvenir, quality = excluded.quality, float_value = excluded.float_value,
          price_uzs = excluded.price_uzs, price_usd = excluded.price_usd, price_raw = excluded.price_raw,
          status = excluded.status, unban = excluded.unban, no_ban = excluded.no_ban, contact = excluded.contact,
          image_url = coalesce(excluded.image_url, oxy.tg_posts.image_url),
          file_id = coalesce(excluded.file_id, oxy.tg_posts.file_id),
          source = excluded.source, updated_at = now()
      `;
    }
  });
  return rows.length;
}

// e'lonlar: statuses = ['available','sold'] ...
export async function listPosts({ statuses = ['available', 'sold'], limit = 200 } = {}) {
  if (!dbEnabled) {
    const data = await readLocal();
    return Object.values(data.posts)
      .filter((p) => statuses.includes(p.status))
      .sort((a, b) => b.postedAt - a.postedAt)
      .slice(0, limit);
  }
  await ensureMigrations();
  const sql = db();
  const rows = await sql`
    select * from oxy.tg_posts
    where status in ${sql(statuses)}
    order by posted_at desc
    limit ${limit}
  `;
  return rows.map(fromRow);
}

// Kanalning ko'rinib turgan oynasida bor, lekin saqlangan xabarlar ichida endi
// uchramaydiganlar o'chirilgan deb belgilanadi.
export async function markMissing(channel, minId, maxId, presentIds) {
  if (!dbEnabled) {
    const data = await readLocal();
    let n = 0;
    for (const p of Object.values(data.posts)) {
      if (p.channel === channel && p.msgId >= minId && p.msgId <= maxId &&
          !presentIds.includes(p.msgId) && ['available', 'sold'].includes(p.status)) {
        p.status = 'deleted';
        n++;
      }
    }
    if (n) await writeLocal(data);
    return n;
  }
  await ensureMigrations();
  const sql = db();
  const res = await sql`
    update oxy.tg_posts set status = 'deleted', updated_at = now()
    where channel = ${channel} and msg_id between ${minId} and ${maxId}
      and status in ('available', 'sold')
      and not (msg_id = any(${presentIds.length ? presentIds : [-1]}::int[]))
  `;
  return res.count || 0;
}

export async function hasFileId(fileId) {
  if (!fileId) return false;
  if (!dbEnabled) {
    const data = await readLocal();
    return Object.values(data.posts).some((p) => p.fileId === fileId);
  }
  await ensureMigrations();
  const sql = db();
  const rows = await sql`select 1 from oxy.tg_posts where file_id = ${fileId} limit 1`;
  return rows.length > 0;
}

export async function getLastSync() {
  if (!dbEnabled) return (await readLocal()).lastSync || 0;
  await ensureMigrations();
  const sql = db();
  const rows = await sql`select updated_at from oxy.tg_posts where id = ${META_ID}`;
  return rows.length ? new Date(rows[0].updated_at).getTime() : 0;
}

export async function touchSync() {
  if (!dbEnabled) {
    const data = await readLocal();
    data.lastSync = Date.now();
    await writeLocal(data);
    return;
  }
  await ensureMigrations();
  const sql = db();
  await sql`
    insert into oxy.tg_posts (id, channel, msg_id, status, updated_at)
    values (${META_ID}, '_', 0, 'meta', now())
    on conflict (id) do update set updated_at = now()
  `;
}
