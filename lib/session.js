// Yengil sessiya: cookie ichida imzolangan JSON. Tashqi kutubxona kerak emas (Node crypto).
import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'oxy-savdo-dev-secret-change-me';

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
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
