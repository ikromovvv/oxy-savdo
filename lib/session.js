// Yengil sessiya: cookie ichida imzolangan JSON. Tashqi kutubxona kerak emas (Node crypto).
import crypto from 'crypto';

// Sirni faqat kerak bo'lganda o'qiymiz — module yuklanganda emas.
// Aks holda SESSION_SECRET sozlanmagan bo'lsa `next build` ham yiqiladi
// (route modullari build paytida tahlil qilinadi). Prod'da ishlash paytida
// hali ham majburiy — birinchi imzolash/tekshirish paytida aniq xato beradi.
function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var is required in production');
  }
  return 'oxy-savdo-dev-secret-change-me';
}

function sign(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

export function createSessionToken(payload) {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, 'utf8').toString('base64url');
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;

  const expected = sign(data);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'oxy_session';
