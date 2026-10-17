// Hamyon (balans) — FAQAT server tomonda o'zgaradi.
//
// Qoidalar:
//  - Balansni hech qachon frontend belgilamaydi; faqat tasdiqlangan to'lov
//    (lib/settle.js), balansdan xarid yoki admin qaytarishi o'zgartiradi.
//  - Har bir o'zgarish ledger'ga (oxy.wallet_txns) yoziladi.
//  - Har amalning `key` i bor (masalan "deposit:<orderId>") — UNIQUE, shuning
//    uchun takroriy callback / qayta urinish balansni ikki marta o'zgartirmaydi.
//  - Yechish atomik: `balance >= amount` sharti bilan bitta UPDATE; manfiy
//    balans mumkin emas (CHECK ham bor).
//
// DATABASE_URL bo'lsa Postgres, bo'lmasa (lokal/test) KV yoki data/wallets.json.

import { promises as fs } from 'fs';
import path from 'path';
import { db, dbEnabled } from './db';
import { kvEnabled, kvGet, kvSet } from './kv';
import { ensureMigrations } from './orderStore';

const LOCAL_FILE = path.join(process.cwd(), 'data', 'wallets.json');
const KV_KEY = 'oxy:wallets';

function toAmount(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowTxn(r) {
  return {
    id: Number(r.id),
    kind: r.kind,
    amount: Number(r.amount),
    balanceAfter: Number(r.balance_after),
    ref: r.ref || null,
    note: r.note || null,
    at: new Date(r.created_at).getTime(),
  };
}

// ---------- Postgres ----------

async function pgGet(steamid, limit) {
  await ensureMigrations();
  const sql = db();
  const [w] = await sql`select balance from oxy.wallets where steamid = ${steamid}`;
  const rows = await sql`
    select id, kind, amount, balance_after, ref, note, created_at
    from oxy.wallet_txns where steamid = ${steamid}
    order by id desc limit ${limit}
  `;
  return { balance: w ? Number(w.balance) : 0, txns: rows.map(rowTxn) };
}

async function pgMove(steamid, signed, { kind, ref, key, note }) {
  await ensureMigrations();
  const sql = db();
  try {
    return await sql.begin(async (tx) => {
      await tx`insert into oxy.wallets (steamid) values (${steamid}) on conflict (steamid) do nothing`;
      // shu amal allaqachon bajarilganmi? (idempotentlik)
      const dup = await tx`
        select 1 from oxy.wallet_txns where provider = 'wallet' and provider_txn_id = ${key}
      `;
      const [cur] = await tx`select balance from oxy.wallets where steamid = ${steamid} for update`;
      if (dup.length) return { ok: true, duplicate: true, balance: Number(cur.balance) };

      // yechishda balance >= summa sharti SQL ichida — poyga (race) bo'lmaydi
      const upd =
        signed >= 0
          ? await tx`
              update oxy.wallets set balance = balance + ${signed}, updated_at = now()
              where steamid = ${steamid} returning balance`
          : await tx`
              update oxy.wallets set balance = balance + ${signed}, updated_at = now()
              where steamid = ${steamid} and balance >= ${-signed} returning balance`;
      if (!upd.length) return { ok: false, error: 'insufficient', balance: Number(cur.balance) };

      const after = Number(upd[0].balance);
      await tx`
        insert into oxy.wallet_txns (steamid, kind, amount, balance_after, ref, provider, provider_txn_id, note)
        values (${steamid}, ${kind}, ${signed}, ${after}, ${ref || null}, 'wallet', ${key}, ${note || null})
      `;
      return { ok: true, balance: after };
    });
  } catch (e) {
    // UNIQUE (provider, provider_txn_id) poygasi — boshqa so'rov oldin yozib bo'lgan
    if (e?.code === '23505') {
      const w = await pgGet(steamid, 1);
      return { ok: true, duplicate: true, balance: w.balance };
    }
    throw e;
  }
}

// ---------- KV / fayl (lokal ishlab chiqish va testlar) ----------

async function readLocal() {
  if (kvEnabled) {
    try {
      const raw = await kvGet(KV_KEY);
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}
    return { wallets: {}, txns: [], seq: 0 };
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8'));
  } catch {
    return { wallets: {}, txns: [], seq: 0 };
  }
}

async function writeLocal(data) {
  if (kvEnabled) return kvSet(KV_KEY, data);
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let _lock = Promise.resolve(); // bitta jarayon ichida ketma-ketlik
async function localMove(steamid, signed, { kind, ref, key, note }) {
  const run = async () => {
    const data = await readLocal();
    const bal = Number(data.wallets[steamid]?.balance || 0);
    if (data.txns.some((t) => t.key === key)) return { ok: true, duplicate: true, balance: bal };
    if (signed < 0 && bal < -signed) return { ok: false, error: 'insufficient', balance: bal };
    const after = bal + signed;
    data.wallets[steamid] = { balance: after };
    data.seq = (data.seq || 0) + 1;
    data.txns.push({ id: data.seq, steamid, kind, amount: signed, balanceAfter: after, ref: ref || null, note: note || null, at: Date.now(), key });
    await writeLocal(data);
    return { ok: true, balance: after };
  };
  const p = _lock.then(run, run);
  _lock = p.catch(() => {});
  return p;
}

async function localGet(steamid, limit) {
  const data = await readLocal();
  return {
    balance: Number(data.wallets[steamid]?.balance || 0),
    txns: data.txns
      .filter((t) => t.steamid === steamid)
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map(({ key, steamid: _s, ...t }) => t),
  };
}

// ---------- ochiq API ----------

export async function getWallet(steamid, { limit = 20 } = {}) {
  if (!steamid) return { balance: 0, txns: [] };
  return dbEnabled ? pgGet(String(steamid), limit) : localGet(String(steamid), limit);
}

export async function getBalance(steamid) {
  return (await getWallet(steamid, { limit: 0 })).balance;
}

// Kirim. key — idempotentlik kaliti (majburiy).
export async function creditWallet({ steamid, amount, kind = 'deposit', ref, key, note }) {
  const amt = toAmount(amount);
  if (!steamid || !amt || !key) return { ok: false, error: 'bad_args' };
  const opts = { kind, ref, key, note };
  return dbEnabled ? pgMove(String(steamid), amt, opts) : localMove(String(steamid), amt, opts);
}

// Chiqim (xarid). Balans yetmasa { ok:false, error:'insufficient' }.
export async function debitWallet({ steamid, amount, kind = 'purchase', ref, key, note }) {
  const amt = toAmount(amount);
  if (!steamid || !amt || !key) return { ok: false, error: 'bad_args' };
  const opts = { kind, ref, key, note };
  return dbEnabled ? pgMove(String(steamid), -amt, opts) : localMove(String(steamid), -amt, opts);
}
