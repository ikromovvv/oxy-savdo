// Admin sessiyasi — mavjud lib/session.js imzolash mexanizmidan foydalanadi.
// Parol .env.local dagi ADMIN_PASSWORD bilan solishtiriladi (timing-safe).
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { createSessionToken, verifySessionToken } from './session';

export const ADMIN_COOKIE = 'oxy_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 kun

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !input) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function makeAdminCookie() {
  const token = createSessionToken({ admin: true, exp: Date.now() + MAX_AGE * 1000 });
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

// Route handler ichida chaqiriladi (next/headers cookies() ga tayanadi)
export function isAdmin() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const session = verifySessionToken(token);
  return Boolean(session && session.admin === true);
}
