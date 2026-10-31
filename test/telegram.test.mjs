// Telegram kanal e'lonlari: parser, kanal HTML'i, webhook — node:test, tarmoqsiz.
// Namunalar real kanal (t.me/oxyskinshop) postlaridan olingan.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oxy-tg-'));
fs.mkdirSync(path.join(TMP, 'data'), { recursive: true });
process.chdir(TMP);
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
process.env.TG_CHANNEL = 'oxyskinshop';
process.env.USD_UZS = '12700';

const PROJECT = path.resolve(import.meta.dirname, '..');
const imp = (rel) => import(pathToFileURL(path.join(PROJECT, rel)).href);

const { parsePost, dedupeKey } = await imp('lib/tgParse.js');
const { parseChannelHtml } = await imp('lib/tgSync.js');
const { ingestUpdate } = await imp('lib/tgIngest.js');
const { listPosts } = await imp('lib/tgStore.js');
const { toPublic, marketName } = await imp('lib/tgListings.js');

// -------- parser: real postlar --------

test('parser: UZS narx, nuqta = minglik (809.990 -> 809990), unban sanasi', () => {
  const p = parsePost(`\u{1F52B}M4A4 | Full Throttle\n\n⭐Quality: minimal wear\n\u{1F4A7}Float: 0.11\n\nNarx: 809.990 UZS\u{1F4B0}\n\nunban: 25.10.2026⏳\nAdmin: @oxy_skins`);
  assert.equal(p.name, 'M4A4 | Full Throttle');
  assert.equal(p.quality, 'MW');
  assert.equal(p.float, 0.11);
  assert.equal(p.priceUzs, 809990);
  assert.equal(p.priceUsd, null);
  assert.equal(p.status, 'available');
  assert.equal(p.unban, '25.10.2026');
  assert.equal(p.contact, '@oxy_skins');
  assert.equal(p.stattrak, false);
});

test('parser: USD narx + StatTrak ("StatTrack" xato yozuvi) + No ban', () => {
  const p = parsePost(`StatTrack\u{1F525}\u{1F525} Butterfly Knife | Night\n\n⭐Quality: battle scared\n\u{1F4A7}Float: 0.68\n\nNarx: 429.99$\u{1F4B0}\n\nNo ban\nAdmin: @oxy_skins`);
  assert.equal(p.name, 'Butterfly Knife | Night');
  assert.equal(p.stattrak, true);
  assert.equal(p.quality, 'BS'); // "battle scared" (xato yozuv) ham taniladi
  assert.equal(p.float, 0.68);
  assert.equal(p.priceUsd, 429.99);
  assert.equal(p.priceUzs, null);
  assert.equal(p.noBan, true);
  assert.equal(p.unban, null);
});

test('parser: "SOTILDI" -> sold, narx yo\'q', () => {
  const p = parsePost(`AWP | Black Nile\n\n⭐Quality: minimal wear\n\u{1F4A7}Float: 0.10\n\nNarx: SOTILDI❌❌\n\nNo ban\nAdmin: @oxy_skins`);
  assert.equal(p.status, 'sold');
  assert.equal(p.priceUzs, null);
  assert.equal(p.priceUsd, null);
  assert.equal(p.quality, 'MW');
});

test('parser: skin bo\'lmagan post (e\'lon, xabar) -> null', () => {
  assert.equal(parsePost(`\u{1F4E2}CS2 SKINLAR SOTIB OLAMIZ\u{1F4E2}\n\n\u{1F4B8} 3$ VA UNDAN YUQORI NARXDAGI SKINLARNI OLIB QOLAMIZ\n\nAdmin: @oxy_skins`), null);
  assert.equal(parsePost(''), null);
  assert.equal(parsePost('oxy kut'), null);
});

test('parser: float bo\'lmasa sifatdan, sifat bo\'lmasa floatdan aniqlanadi; minglik / o\'nlik ajratiladi', () => {
  assert.equal(parsePost('AK-47 | Redline\nFloat: 0.2\nNarx: 1.299.000 UZS').quality, 'FT');
  assert.equal(parsePost('AK-47 | Redline\nFloat: 0.2\nNarx: 1.299.000 UZS').priceUzs, 1299000);
  assert.equal(parsePost('AK-47 | Redline\nQuality: factory new\nNarx: 3$').priceUsd, 3);
  assert.equal(parsePost('AK-47 | Redline\nQuality: factory new\nNarx: 1 299$').priceUsd, 1299);
});

test('dedupe: bir xil skin (nom+float+sifat) bir xil kalit beradi', () => {
  const a = parsePost('MAC-10 | Pipe Down\nQuality: factory new\nFloat: 0.03\nNarx: 59.990 UZS');
  const b = parsePost('MAC-10 | Pipe Down\nQuality: factory new\nFloat: 0.03\nNarx: 59.990 UZS\nunban: 25.10.2026');
  const c = parsePost('MAC-10 | Pipe Down\nQuality: factory new\nFloat: 0.04\nNarx: 59.990 UZS');
  assert.equal(dedupeKey(a), dedupeKey(b));
  assert.notEqual(dedupeKey(a), dedupeKey(c));
});

// -------- kanal HTML --------

const HTML = `
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="oxyskinshop/34">
<a class="tgme_widget_message_photo_wrap 5" href="https://t.me/oxyskinshop/34" style="width:800px;background-image:url('https://cdn4.telesco.pe/file/abc-1.jpg')"></a>
<div class="tgme_widget_message_text js-message_text" dir="auto"><i class="emoji" style="background-image:url('//telegram.org/img/emoji/40/F09F94AB.png')"><b>&#128299;</b></i>MAC-10 | Pipe Down<br/><br/><i class="emoji"><b>&#11088;</b></i>Quality: factory new<br/>Float: 0.03<br/><br/>Narx: 59.990 UZS<br/>unban: 25.10.2026<br/>Admin: @oxy_skins</div>
<div class="tgme_widget_message_footer"><a class="tgme_widget_message_date" href="https://t.me/oxyskinshop/34"><time datetime="2026-10-22T06:41:50+00:00" class="time">06:41</time></a></div></div></div>
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="oxyskinshop/31">
<div class="tgme_widget_message_text js-message_text">CS2 SKINLAR SOTIB OLAMIZ<br/>Admin: @oxy_skins</div>
<div class="tgme_widget_message_footer"><a class="tgme_widget_message_date"><time datetime="2026-10-21T11:53:23+00:00">11:53</time></a></div></div></div>
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="oxyskinshop/28">
<div class="tgme_widget_message_text js-message_text">AWP | Mortis<br/>Quality: battle scared<br/>Float: 0.61<br/>Narx: SOTILDI</div>
<div class="tgme_widget_message_footer"><a class="tgme_widget_message_date"><time datetime="2026-10-20T17:21:20+00:00">17:21</time></a></div></div></div>`;

test('kanal HTML: skin postlar ajratiladi, rasm/vaqt/id olinadi, e\'lon (skin emas) tashlanadi', () => {
  const { rows, ids } = parseChannelHtml(HTML, 'oxyskinshop');
  assert.deepEqual(ids, [34, 31, 28]); // ko'rinib turgan hamma xabar
  assert.equal(rows.length, 2); // 31 — skin emas
  const r34 = rows.find((r) => r.msgId === 34);
  assert.equal(r34.id, 'oxyskinshop/34');
  assert.equal(r34.name, 'MAC-10 | Pipe Down');
  assert.equal(r34.priceUzs, 59990);
  assert.equal(r34.imageUrl, 'https://cdn4.telesco.pe/file/abc-1.jpg');
  assert.equal(r34.postedAt, Date.parse('2026-10-22T06:41:50+00:00'));
  assert.equal(rows.find((r) => r.msgId === 28).status, 'sold');
});

// -------- webhook (bot) --------

test('webhook: kanal posti saqlanadi, tahrir (SOTILDI) shu qatorni yangilaydi', async () => {
  const caption = 'AWP | Hyper Beast\nQuality: field-tested\nFloat: 0.2000\nNarx: 500.000 UZS\nAdmin: @oxy_skins';
  const base = { message_id: 77, date: 1792400000, chat: { id: -100123, username: 'OxySkinShop', type: 'channel' }, caption, photo: [{ file_id: 'small' }, { file_id: 'BIG-FILE-ID' }] };

  assert.equal((await ingestUpdate({ channel_post: base })).ok, true);
  let list = await listPosts({ statuses: ['available', 'sold'] });
  let row = list.find((p) => p.id === 'oxyskinshop/77');
  assert.equal(row.status, 'available');
  assert.equal(row.fileId, 'BIG-FILE-ID');
  assert.equal(row.priceUzs, 500000);
  assert.equal(row.source, 'webhook');

  // admin postni "SOTILDI" ga tahrirlaydi
  const edited = { ...base, caption: caption.replace('Narx: 500.000 UZS', 'Narx: SOTILDI') };
  await ingestUpdate({ edited_channel_post: edited });
  list = await listPosts({ statuses: ['available', 'sold'] });
  row = list.find((p) => p.id === 'oxyskinshop/77');
  assert.equal(row.status, 'sold');
  assert.equal(row.fileId, 'BIG-FILE-ID'); // rasm yo'qolmaydi
  assert.equal(list.filter((p) => p.id === 'oxyskinshop/77').length, 1);
});

test('webhook: boshqa kanal / skin bo\'lmagan post / kanal bo\'lmagan yangilanish e\'tiborsiz', async () => {
  const skin = 'AK-47 | Redline\nQuality: factory new\nFloat: 0.01\nNarx: 3$';
  assert.equal((await ingestUpdate({ channel_post: { message_id: 1, chat: { username: 'boshqakanal' }, caption: skin } })).skip, 'other_chat');
  assert.equal((await ingestUpdate({ channel_post: { message_id: 2, chat: { username: 'oxyskinshop' }, text: 'Assalomu alaykum' } })).skip, 'not_a_skin_post');
  assert.equal((await ingestUpdate({ message: { text: 'hi' } })).skip, 'not_channel_post');
});

// -------- ommaviy shakl --------

test('toPublic: USD narx so\'mga o\'giriladi, rasm manbai, Telegram admin havolasi', () => {
  const r = { id: 'oxyskinshop/32', channel: 'oxyskinshop', msgId: 32, name: 'Butterfly Knife | Night', stattrak: true, quality: 'BS', float: 0.68, priceUzs: null, priceUsd: 429.99, status: 'available', contact: '@oxy_skins', imageUrl: null, fileId: 'AgAC/x', postedAt: 1 };
  const p = toPublic(r, { rarityColor: '#ffd700', rarity: 'Extraordinary' });
  assert.equal(p.priceUzs, Math.round(429.99 * 12700));
  assert.equal(p.image, `/api/tg-img/${encodeURIComponent('AgAC/x')}`);
  assert.ok(p.buyUrl.startsWith('https://t.me/oxy_skins?text='));
  assert.ok(decodeURIComponent(p.buyUrl).includes('float 0.68'));
  assert.equal(p.link, 'https://t.me/oxyskinshop/32');
  assert.equal(marketName(r), 'StatTrak™ Butterfly Knife | Night (Battle-Scarred)');
});

test.after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

// -------- 3D ko'ruvchi (SkinHub) --------

test(`extractInspect: steam:// va csfloat havolalarini topadi, yo'q bo'lsa null`, async () => {
  const { extractInspect, skinhubUrl } = await imp('lib/tgListings.js');
  const steam = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A123456789D987654321';
  assert.equal(extractInspect(`M4A4 | Full Throttle\nFloat: 0.11\n${steam}\nAdmin: @oxy_skins`), steam);
  const cf = 'https://csfloat.com/checker?inspectLink=steam%3A%2F%2Frungame%2F730';
  assert.equal(extractInspect(`narx 100\n${cf} tail`), cf);
  assert.equal(extractInspect('oddiy post, havola yoq'), null);

  const withLink = skinhubUrl({ rawText: steam, name: 'M4A4 | Full Throttle', quality: 'MW', stattrak: false });
  assert.ok(withLink.startsWith('https://skinhub.gg/inspect?i='));
  const byName = skinhubUrl({ rawText: '', name: 'M4A4 | Full Throttle', quality: 'MW', stattrak: false });
  assert.equal(byName, 'https://skinhub.gg/inspect?hash=' + encodeURIComponent('M4A4 | Full Throttle (Minimal Wear)'));
});
