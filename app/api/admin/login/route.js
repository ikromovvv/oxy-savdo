import { NextResponse } from 'next/server';
import { adminPasswordConfigured, checkPassword, makeAdminCookie } from '@/lib/adminAuth';

export async function POST(req) {
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

  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Parol noto\'g\'ri' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const c = makeAdminCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
