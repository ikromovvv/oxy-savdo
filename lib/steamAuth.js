// Steam orqali kirish (OpenID 2.0). Steam OAuth ishlatmaydi — bu klassik OpenID oqimi.
// 1) foydalanuvchi /api/auth/steam/login ga o'tadi -> Steam sahifasiga yo'naltiriladi
// 2) Steam'da tasdiqlagach /api/auth/steam/callback ga qaytadi
// 3) javob steamcommunity'da tekshiriladi va SteamID64 olinadi
// 4) STEAM_API_KEY yordamida foydalanuvchi profili (ism, avatar) olinadi

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

export function buildSteamLoginUrl({ returnTo, realm }) {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

// Steam'dan qaytgan javobni steamcommunity serverida tasdiqlaydi va SteamID64'ni qaytaradi.
export async function verifySteamAssertion(searchParams) {
  if (searchParams.get('openid.mode') !== 'id_res') return null;

  const params = new URLSearchParams(searchParams);
  params.set('openid.mode', 'check_authentication');

  const res = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const text = await res.text();
  if (!/is_valid\s*:\s*true/i.test(text)) return null;

  const claimedId = searchParams.get('openid.claimed_id') || '';
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

// Steam Web API orqali foydalanuvchi profili (ism, avatar). STEAM_API_KEY bo'lmasa ham ishlaydi,
// faqat ism/avatar chiqmaydi.
export async function fetchSteamProfile(steamId) {
  const key = process.env.STEAM_API_KEY;
  const fallback = {
    steamid: steamId,
    name: `Steam ${steamId.slice(-4)}`,
    avatar: '',
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
  };
  if (!key) return fallback;

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamId}`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    const player = data?.response?.players?.[0];
    if (!player) return fallback;
    return {
      steamid: steamId,
      name: player.personaname || fallback.name,
      avatar: player.avatarfull || player.avatarmedium || '',
      profileUrl: player.profileurl || fallback.profileUrl,
    };
  } catch {
    return fallback;
  }
}
