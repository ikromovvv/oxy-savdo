// Telegram Mini App initData tekshiruvi (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
// initData faqat bot tokeni bilan imzolangan bo'lsa haqiqiy hisoblanadi — shu orqali foydalanuvchi ID'si soxtalashtirilmaydi.

import crypto from 'crypto';

const MAX_AGE_SEC = 24 * 60 * 60;

export function verifyInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  const a = Buffer.from(calc, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > MAX_AGE_SEC) return null;
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isFinite(user.id) ? user : null;
  } catch {
    return null;
  }
}
