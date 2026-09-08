// Migratsiya runner. `sql` — postgres() instansi.
import { MIGRATIONS } from './dbSchema.js';

export async function runMigrations(sql) {
  await sql`create schema if not exists oxy`;
  await sql`
    create table if not exists oxy._migrations (
      name        text primary key,
      applied_at  timestamptz not null default now()
    )
  `;

  const done = new Set(
    (await sql`select name from oxy._migrations`).map((r) => r.name)
  );

  const applied = [];
  const skipped = [];

  for (const m of MIGRATIONS) {
    if (done.has(m.name)) {
      skipped.push(m.name);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(m.sql);
      await tx`insert into oxy._migrations (name) values (${m.name})`;
    });
    applied.push(m.name);
  }

  return { applied, skipped };
}
