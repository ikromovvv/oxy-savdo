// Tarjimalar to'liqligi: har bir til o'zbekcha lug'atdagi barcha kalitga ega bo'lishi shart.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT = path.resolve(import.meta.dirname, '..');
const { dict, LANGS, t, pick, isLang } = await import(pathToFileURL(path.join(PROJECT, 'lib/i18n.js')).href);

const baseKeys = Object.keys(dict.uz);

test('LANGS: 7 ta til, kodlar noyob', () => {
  assert.deepEqual(LANGS.map((l) => l.code), ['uz', 'ru', 'en', 'es', 'zh', 'tr', 'kk']);
  assert.equal(new Set(LANGS.map((l) => l.code)).size, LANGS.length);
  assert.equal(isLang('en'), true);
  assert.equal(isLang('xx'), false);
});

for (const code of ['ru', 'en', 'es', 'zh', 'tr', 'kk']) {
  test(`${code}: barcha kalitlar bor va bo'sh emas`, () => {
    const missing = baseKeys.filter((k) => !(k in dict[code]));
    const empty = baseKeys.filter((k) => k in dict[code] && String(dict[code][k]).trim() === '');
    const extra = Object.keys(dict[code]).filter((k) => !(k in dict.uz));
    assert.deepEqual(missing, [], `${code}: yo'q kalitlar`);
    assert.deepEqual(empty, [], `${code}: bo'sh qiymatlar`);
    assert.deepEqual(extra, [], `${code}: ortiqcha kalitlar`);
  });

  test(`${code}: {pct} o'rin belgisi saqlangan`, () => {
    assert.ok(dict[code].sell_note.includes('{pct}'));
  });
}

test('t(): zaxira zanjiri (yangi til -> ingliz -> o\'zbek -> kalit)', () => {
  assert.equal(t('en', 'nav_skins'), 'Skins');
  assert.equal(t('zh', 'nav_skins'), '饰品');
  assert.equal(t('xx', 'nav_skins'), 'Skins'); // noma'lum til -> ingliz
  assert.equal(t('uz', 'yoq_kalit'), 'yoq_kalit');
});

test('pick(): joriy til, yo\'q bo\'lsa ingliz -> rus -> o\'zbek', () => {
  const o = { uz: 'U', ru: 'R' };
  assert.equal(pick(o, 'uz'), 'U');
  assert.equal(pick(o, 'ru'), 'R');
  assert.equal(pick(o, 'zh'), 'R');
  assert.equal(pick({ uz: 'U', en: 'E' }, 'es'), 'E');
  assert.equal(pick(undefined, 'en'), '');
});
