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
  let username = '';
  try {
    ({ password, username = '' } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  const account = findAdminByPassword(password);
  if (!account) {
    return NextResponse.json({ ok: false, error: 'Parol noto\'g\'ri' }, { status: 401 });
  }

  // login kiritilgan bo'lsa u akkaunt nomiga mos kelishi kerak (bo'sh qoldirsa — faqat parol, avvalgidek)
  const u = String(username || '').trim().toLowerCase();
  if (u && u !== String(account.name).trim().toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, name: account.name, role: account.role });
  const c = makeAdminCookie(account);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
