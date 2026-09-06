// Steam "Trade URL" tekshirish/ajratish.
// Namuna: https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCd_12-x

export function parseTradeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)steamcommunity\.com$/i.test(u.hostname)) return null;
  if (!u.pathname.replace(/\/+$/, '').endsWith('/tradeoffer/new')) return null;

  const partner = u.searchParams.get('partner');
  const token = u.searchParams.get('token');
  if (!partner || !/^\d{1,20}$/.test(partner)) return null;
  if (!token || !/^[A-Za-z0-9_-]{3,20}$/.test(token)) return null;

  return {
    partner,
    token,
    url: `https://steamcommunity.com/tradeoffer/new/?partner=${partner}&token=${token}`,
  };
}

export function isValidTradeUrl(input) {
  return parseTradeUrl(input) !== null;
}
