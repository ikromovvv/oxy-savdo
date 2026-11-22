// Admin sessiyasi — mavjud lib/session.js imzolash mexanizmidan foydalanadi.
// Bir nechta admin: har birining o'z paroli va o'z LIS-SKINS API kaliti (o'z balansi).
//   Env:  ADMIN_PASSWORD (+ LIS_SKINS_API_KEY)               — asosiy admin ('main'), avvalgidek ishlaydi
//         ADMIN_1_NAME, ADMIN_1_PASSWORD, ADMIN_1_LIS_KEY    — qo'shimcha adminlar (1..9)
//   Parollar bir-biridan farq qilishi shart: admin parol bo'yicha aniqlanadi.
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { createSessionToken, verifySessionToken } from './session';

export const ADMIN_COOKIE = 'oxy_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 kun

export function adminAccounts() {
  const list = [];
  if (process.env.ADMIN_PASSWORD) {
    list.push({
      id: 'main',
      name: process.env.ADMIN_NAME || 'Admin',
      password: process.env.ADMIN_PASSWORD,
      lisKey: process.env.LIS_SKINS_API_KEY || '',
    });
  }
  for (let i = 1; i <= 9; i++) {
    const password = process.env[`ADMIN_${i}_PASSWORD`];
    if (!password) continue;
    list.push({
      id: `a${i}`,
      name: process.env[`ADMIN_${i}_NAME`] || `Admin ${i}`,
      password,
      lisKey: process.env[`ADMIN_${i}_LIS_KEY`] || '',
    });
  }
  return list;
}

export function adminPasswordConfigured() {
  return adminAccounts().length > 0;
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Parol bo'yicha admin akkauntini topadi (timing-safe) -> akkaunt | null
export function findAdminByPassword(input) {
  if (!input) return null;
  const h = sha(input);
  let found = null;
  for (const a of adminAccounts()) {
    if (crypto.timingSafeEqual(h, sha(a.password))) found = a;
  }
  return found;
}

export const checkPassword = (input) => Boolean(findAdminByPassword(input));

export function makeAdminCookie(account) {
  const token = createSessionToken({ admin: true, aid: account?.id || 'main', exp: Date.now() + MAX_AGE * 1000 });
  return {
    name: ADMIN_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    },
  };
}

export function clearAdminCookie() {
  return { name: ADMIN_COOKIE, value: '', options: { path: '/', maxAge: 0 } };
}

// Joriy admin akkaunti (route handler ichida) -> akkaunt | null
export function currentAdmin() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session || session.admin !== true) return null;
  const id = session.aid || 'main'; // eski sessiyalar — asosiy admin
  return adminAccounts().find((a) => a.id === id) || null;
}

export function isAdmin() {
  return Boolean(currentAdmin());
}
