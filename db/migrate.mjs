// Lokal migratsiya:  node db/migrate.mjs
// .env.local dan DATABASE_URL o'qiladi. Vercel'da esa /api/admin/db-migrate
// endpoint'idan foydalaning (u yerda DATABASE_URL avtomatik mavjud).

import path from 'node:path';
import fs from 'node:fs';
import postgres from 'postgres';
import { runMigrations } from '../lib/dbMigrate.js';

try {
  const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const URL =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

if (!URL) {
  console.error(
    'DATABASE_URL topilmadi. .env.local ga Neon connection string qo\'shing ' +
      'yoki Vercel\'da /api/admin/db-migrate dan foydalaning.'
  );
  process.exit(1);
}

const sql = postgres(URL, { max: 1, prepare: false, onnotice: () => {} });
const res = await runMigrations(sql);
await sql.end();

console.log('Qo\'llandi:', res.applied.length ? res.applied.join(', ') : '(yo\'q)');
console.log('O\'tkazildi:', res.skipped.length ? res.skipped.join(', ') : '(yo\'q)');
