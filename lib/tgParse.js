// Telegram kanal postini skin e'loniga aylantiradi. Kanal formati:
//
//   <emoji> [StatTrak] AWP | Black Nile
//   <emoji> Quality: minimal wear
//   <emoji> Float: 0.10
//   Narx: 809.990 UZS   |   429.99$   |   SOTILDI
//   unban: 25.10.2026   |   No ban
//   Admin: @oxy_skins
//
// Skin e'loni bo'lmagan postlar (xabarlar, "skin sotib olamiz" e'lonlari) -> null.

const WEAR = [
  { key: 'FN', test: /factory/i, name: 'Factory New' },
  { key: 'MW', test: /minimal/i, name: 'Minimal Wear' },
  { key: 'FT', test: /field/i, name: 'Field-Tested' },
  { key: 'WW', test: /well/i, name: 'Well-Worn' },
  { key: 'BS', test: /battle|scar/i, name: 'Battle-Scarred' },
];

export const WEAR_FULL = Object.fromEntries(WEAR.map((w) => [w.key, w.name]));

function wearFromFloat(f) {
  if (!Number.isFinite(f)) return null;
  if (f < 0.07) return 'FN';
  if (f < 0.15) return 'MW';
  if (f < 0.38) return 'FT';
  if (f < 0.45) return 'WW';
  return 'BS';
}

// "809.990" / "1 299" / "1,299" -> minglik guruhlari; "429.99" / "0,5" -> o'nlik
function parseNumber(raw) {
  const s = String(raw).trim();
  if (/^\d{1,3}([.,\s]\d{3})+$/.test(s)) return Number(s.replace(/[.,\s]/g, ''));
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function cleanLine(line) {
  // boshidagi emoji / belgilarni olib tashlaymiz (harf, raqam, ★ qoladi)
  return String(line || '')
    .replace(/[ ​]/g, ' ')
    .replace(/^[^\p{L}\p{N}★]+/u, '')
    .trim();
}

export function parsePost(text) {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // 1) nom qatori: "Qurol | Skin" ko'rinishidagi birinchi qator
  const nameIdx = lines.findIndex((l) => /\S\s*\|\s*\S/.test(l) && !/^\s*(quality|float|narx|admin)/i.test(cleanLine(l)));
  if (nameIdx === -1) return null;
  let name = cleanLine(lines[nameIdx]);

  let stattrak = false;
  if (/stat\s*-?\s*tr(a)?c?k|st™|™/i.test(name)) {
    stattrak = true;
    name = name.replace(/stat\s*-?\s*tr(a)?c?k™?|st™|™/gi, '');
  }
  const souvenir = /souvenir/i.test(name);
  name = cleanLine(name.replace(/souvenir/gi, '').replace(/\s{2,}/g, ' '));
  // StatTrak'dan keyingi ortiqcha emoji (masalan "StatTrack?? Butterfly...")
  name = name.replace(/^[^\p{L}\p{N}★]+/u, '').trim();
  if (!name) return null;

  const get = (re) => {
    for (const l of lines) {
      const m = cleanLine(l).match(re);
      if (m) return m[1].trim();
    }
    return null;
  };

  // 2) sifat (wear) va float
  const qRaw = get(/^quality\s*[:\-]\s*(.+)$/i);
  const wearHit = qRaw ? WEAR.find((w) => w.test.test(qRaw)) : null;
  const fRaw = get(/^float\s*[:\-]\s*([0-9]+(?:[.,][0-9]+)?)/i);
  const floatValue = fRaw != null ? Number(fRaw.replace(',', '.')) : null;
  const quality = wearHit?.key || wearFromFloat(floatValue);

  // skin e'loni ekanini tasdiqlash: sifat yoki float bo'lishi kerak
  if (!quality && floatValue == null) return null;

  // 3) narx va holat
  const narxRaw = get(/^narx\s*[:\-]?\s*(.+)$/i) || '';
  const sold = /sotil?di|sold|продан/i.test(raw);
  let priceUzs = null;
  let priceUsd = null;
  if (!sold && narxRaw) {
    const isUsd = /\$|usd|dollar/i.test(narxRaw);
    const num = narxRaw.match(/[0-9][0-9.,\s]*/);
    const value = num ? parseNumber(num[0].trim().replace(/[.,]$/, '')) : null;
    if (value != null) {
      if (isUsd) priceUsd = value;
      else priceUzs = Math.round(value);
    }
  }

  // 4) qo'shimcha ma'lumotlar
  const unban = get(/^unban\s*[:\-]?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
  const noBan = /no\s*-?\s*ban/i.test(raw);
  const contactM = raw.match(/admin\s*[:\-]?\s*(@[A-Za-z0-9_]{4,32})/i);

  return {
    name,
    stattrak,
    souvenir,
    quality, // FN | MW | FT | WW | BS
    float: Number.isFinite(floatValue) ? floatValue : null,
    priceUzs,
    priceUsd,
    priceRaw: narxRaw || null,
    status: sold ? 'sold' : 'available',
    unban: unban || null,
    noBan,
    contact: contactM ? contactM[1] : null,
  };
}

// Skin e'lonlarini takrorlanishdan saqlash uchun kalit (bir xil skin qayta joylansa)
export function dedupeKey(p) {
  return [p.name, p.stattrak ? 'st' : '', p.quality || '', p.float ?? ''].join('|').toLowerCase();
}
