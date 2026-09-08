// Postgres ulanishi (Neon). Pul yo'lidagi ma'lumot (buyurtma, to'lov) shu yerda
// saqlanadi — tranzaksiya va UNIQUE cheklovlari bilan (Redis KV emas).
//
// .env.local:
//   DATABASE_URL=postgres://...   (Neon "pooled" ulanish satri — Vercel'da
//                                  Storage -> Neon ulanganда avtomatik keladi)

import postgres from 'postgres';

const URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  '';

export const dbEnabled = Boolean(URL);

let _sql = null;

export function db() {
  if (!dbEnabled) throw new Error('DATABASE_URL sozlanmagan');
  if (!_sql) {
    _sql = postgres(URL, {
      max: 3, // serverless — kam ulanish
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Neon pooler (pgbouncer transaction mode) bilan mos
      onnotice: () => {},
      // barcha jadvallar "oxy" sxemasida — bo'lishilgan DB'da public'ga tegmaymiz
      connection: { search_path: 'oxy,public' },
    });
  }
  return _sql;
}
