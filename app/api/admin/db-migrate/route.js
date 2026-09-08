import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { db, dbEnabled } from '@/lib/db';
import { runMigrations } from '@/lib/dbMigrate';

export const dynamic = 'force-dynamic';

// Postgres migratsiyalarini qo'llaydi (idempotent — qayta chaqirish xavfsiz).
// Himoya: admin sessiyasi YOKI  Authorization: Bearer <MIGRATE_SECRET>
function authorized(req) {
  const secret = process.env.MIGRATE_SECRET;
  const hdr = req.headers.get('authorization') || '';
  if (secret && hdr === `Bearer ${secret}`) return true;
  return isAdmin();
}

async function handle(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) {
    return NextResponse.json({ error: 'DATABASE_URL sozlanmagan' }, { status: 500 });
  }
  try {
    const res = await runMigrations(db());
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    console.error('[db-migrate]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
