import { NextResponse } from 'next/server';
import { adminPasswordConfigured, findAdminByPassword, makeAdminCookie } from '@/lib/adminAuth';
import { limitOr429 } from '@/lib/rateLimit';

export async function POST(req) {
  // parol brute-force'iga qarshi: IP boshiga 5 daqiqada 8 urinish
  const limited = await limitOr429(req, 'admin-login', { limit: 8, windowSec: 300 });
  if (limited) return limited;

  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_PASSWORD sozlanmagan. .env.local ga qo\'shing.' },
      { status: 500 }
    );
  }

  let password = '';
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  const account = findAdminByPassword(password);
  if (!account) {
    return NextResponse.json({ ok: false, error: 'Parol noto\'g\'ri' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, name: account.name });
  const c = makeAdminCookie(account);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
