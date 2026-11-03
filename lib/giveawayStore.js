// Rozigrysh (giveaway) ishtirokchilari saqlash qatlami.
//   DATABASE_URL bo'lsa Postgres (oxy.giveaway_entries / giveaway_winners), bo'lmasa data/giveaway.json.
// Ishtirok sharti: (1) kanalga obuna, (2) saytda Steam bilan kirgan va Telegram akkauntiga bog'langan.
// Bitta Steam akkaunt faqat bitta Telegram akkauntga bog'lanadi (ko'p akkaunt bilan qatnashishga qarshi).

import { promises as fs } from 'fs';
import path from 'path';
import { db, dbEnabled } from './db';
import { ensureMigrations } from './orderStore';

const LOCAL_FILE = path.join(process.cwd(), 'data', 'giveaway.json');

function fromRow(r) {
  return {
    tgId: Number(r.tg_id),
    tgUsername: r.tg_username || null,
    tgName: r.tg_name || null,
    steamid: r.steamid || null,
    steamName: r.steam_name || null,
    subscribed: Boolean(r.subscribed),
    linkedAt: r.linked_at ? new Date(r.linked_at).getTime() : null,
    createdAt: new Date(r.created_at).getTime(),
  };
}

async function readLocal() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8'));
  } catch {
    return { entries: {}, winners: [] };
  }
}
async function writeLocal(data) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export const isEligible = (e) => Boolean(e && e.subscribed && e.steamid);

// Botdan kelgan foydalanuvchi + obuna holati
export async function upsertEntry({ tgId, username = null, name = null, subscribed }) {
  if (!dbEnabled) {
    const data = await readLocal();
    const cur = data.entries[tgId] || { tgId: Number(tgId), steamid: null, steamName: null, linkedAt: null, createdAt: Date.now() };
    data.entries[tgId] = { ...cur, tgUsername: username, tgName: name, subscribed: Boolean(subscribed) };
    await writeLocal(data);
    return data.entries[tgId];
  }
  await ensureMigrations();
  const sql = db();
  const [row] = await sql`
    insert into oxy.giveaway_entries (tg_id, tg_username, tg_name, subscribed, updated_at)
    values (${tgId}, ${username}, ${name}, ${Boolean(subscribed)}, now())
    on conflict (tg_id) do update set
      tg_username = excluded.tg_username, tg_name = excluded.tg_name,
      subscribed = excluded.subscribed, updated_at = now()
    returning *
  `;
  return fromRow(row);
}

export async function setSubscribed(tgId, subscribed) {
  if (!dbEnabled) {
    const data = await readLocal();
    if (!data.entries[tgId]) return null;
    data.entries[tgId].subscribed = Boolean(subscribed);
    await writeLocal(data);
    return data.entries[tgId];
  }
  await ensureMigrations();
  const [row] = await db()`update oxy.giveaway_entries set subscribed = ${Boolean(subscribed)}, updated_at = now() where tg_id = ${tgId} returning *`;
  return row ? fromRow(row) : null;
}

// Saytda Steam bilan kirgan foydalanuvchini Telegram akkauntga bog'lash.
// -> { entry } yoki { error: 'steam_taken' }
export async function linkSteam({ tgId, username = null, steamid, steamName = null }) {
  if (!dbEnabled) {
    const data = await readLocal();
    const taken = Object.values(data.entries).find((e) => e.steamid === steamid && Number(e.tgId) !== Number(tgId));
    if (taken) return { error: 'steam_taken' };
    const cur = data.entries[tgId] || { tgId: Number(tgId), subscribed: false, createdAt: Date.now() };
    data.entries[tgId] = { ...cur, tgUsername: username ?? cur.tgUsername ?? null, steamid, steamName, linkedAt: Date.now() };
    await writeLocal(data);
    return { entry: data.entries[tgId] };
  }
  await ensureMigrations();
  const sql = db();
  const taken = await sql`select tg_id from oxy.giveaway_entries where steamid = ${steamid} and tg_id <> ${tgId} limit 1`;
  if (taken.length) return { error: 'steam_taken' };
  const [row] = await sql`
    insert into oxy.giveaway_entries (tg_id, tg_username, steamid, steam_name, linked_at, updated_at)
    values (${tgId}, ${username}, ${steamid}, ${steamName}, now(), now())
    on conflict (tg_id) do update set
      steamid = excluded.steamid, steam_name = excluded.steam_name, linked_at = now(), updated_at = now(),
      tg_username = coalesce(excluded.tg_username, oxy.giveaway_entries.tg_username)
    returning *
  `;
  return { entry: fromRow(row) };
}

export async function getEntry(tgId) {
  if (!dbEnabled) return (await readLocal()).entries[tgId] || null;
  await ensureMigrations();
  const [row] = await db()`select * from oxy.giveaway_entries where tg_id = ${tgId}`;
  return row ? fromRow(row) : null;
}

export async function listEntries() {
  if (!dbEnabled) {
    return Object.values((await readLocal()).entries).sort((a, b) => b.createdAt - a.createdAt);
  }
  await ensureMigrations();
  const rows = await db()`select * from oxy.giveaway_entries order by created_at desc limit 5000`;
  return rows.map(fromRow);
}

export async function recordWinner({ tgId, steamid, note = null }) {
  if (!dbEnabled) {
    const data = await readLocal();
    data.winners.unshift({ tgId: Number(tgId), steamid, note, drawnAt: Date.now() });
    await writeLocal(data);
    return;
  }
  await ensureMigrations();
  await db()`insert into oxy.giveaway_winners (tg_id, steamid, note) values (${tgId}, ${steamid}, ${note})`;
}

export async function listWinners() {
  if (!dbEnabled) return (await readLocal()).winners || [];
  await ensureMigrations();
  const rows = await db()`select * from oxy.giveaway_winners order by drawn_at desc limit 50`;
  return rows.map((r) => ({ tgId: Number(r.tg_id), steamid: r.steamid, note: r.note, drawnAt: new Date(r.drawn_at).getTime() }));
}

// Hamma ishtirokchilarni va g'oliblarni o'chiradi (yangi rozigrishni noldan boshlash).
export async function resetEntries() {
  if (!dbEnabled) {
    const data = await readLocal();
    const n = Object.keys(data.entries).length;
    data.entries = {};
    data.winners = [];
    await writeLocal(data);
    return n;
  }
  await ensureMigrations();
  await db()`delete from oxy.giveaway_winners`;
  const rows = await db()`delete from oxy.giveaway_entries returning tg_id`;
  return rows.length;
}
