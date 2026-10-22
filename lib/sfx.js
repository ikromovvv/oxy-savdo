// Kichik interfeys tovushlari — Web Audio bilan sintez qilinadi (audio fayl yo'q, og'irlik qo'shmaydi).
// Brauzer foydalanuvchi harakatigacha ovozni bloklaydi: shuning uchun bosish/click paytida chaladi,
// bloklangan bo'lsa jim o'tadi. Yoqish/o'chirish localStorage'da saqlanadi.

const KEY = 'oxy:sound';
let ctx = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* e'tiborsiz */
  }
}

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx.state === 'running' || ctx.state === 'suspended' ? ctx : null;
}

// bitta nota: chastota (Hz) -> to'xtaydi, vaqt bilan so'nadi
function tone(c, { f0, f1 = f0, at = 0, dur = 0.14, type = 'sine', vol = 0.06 }) {
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  // savatga qo'shildi — yuqoriga ketuvchi qisqa "pip-pip"
  add: (c) => {
    tone(c, { f0: 660, f1: 880, dur: 0.11, type: 'triangle' });
    tone(c, { f0: 1100, f1: 1320, at: 0.08, dur: 0.14, type: 'triangle' });
  },
  // savatdan olib tashlandi — pastga
  remove: (c) => tone(c, { f0: 520, f1: 260, dur: 0.16, type: 'triangle' }),
  // savat / modal ochildi — yumshoq "tik"
  open: (c) => tone(c, { f0: 480, f1: 620, dur: 0.09, type: 'sine', vol: 0.045 }),
  // muvaffaqiyat (buyurtma / to'lov) — uch notali akkord
  success: (c) => {
    tone(c, { f0: 523, at: 0, dur: 0.18, type: 'triangle' });
    tone(c, { f0: 659, at: 0.09, dur: 0.18, type: 'triangle' });
    tone(c, { f0: 784, at: 0.18, dur: 0.32, type: 'triangle' });
  },
  // kirish animatsiyasi tugashi — "whoosh"
  whoosh: (c) => {
    tone(c, { f0: 180, f1: 900, dur: 0.5, type: 'sawtooth', vol: 0.025 });
    tone(c, { f0: 90, f1: 450, dur: 0.5, type: 'sine', vol: 0.05 });
  },
};

// Kirish animatsiyasi bilan sinxron: harflar, nur, SAVDO — CSS kechikishlariga mos (IntroLoader).
// Brauzer avtoplayni bloklagan bo'lsa (hali bosish bo'lmagan) false qaytaradi.
export async function playIntro() {
  if (!soundEnabled()) return false;
  try {
    const c = getCtx();
    if (!c) return false;
    if (c.state !== 'running') await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 120))]);
    if (c.state !== 'running') return false;
    // O, X, Y — pastdan ko'tarilib boruvchi "zarba"
    [[0.35, 196], [0.7, 247], [1.05, 330]].forEach(([at, f]) => {
      tone(c, { f0: f * 0.5, f1: f, at, dur: 0.32, type: 'sine', vol: 0.07 });
      tone(c, { f0: f * 2, at, dur: 0.12, type: 'triangle', vol: 0.025 });
    });
    // harflar birlashadi — pastdan yuqoriga supurish
    tone(c, { f0: 140, f1: 700, at: 1.45, dur: 0.7, type: 'sawtooth', vol: 0.02 });
    // ko'k nur o'tishi — yengil "shimmer"
    tone(c, { f0: 1500, f1: 2400, at: 1.5, dur: 0.9, type: 'sine', vol: 0.014 });
    // SAVDO harflari — mayda "tik"lar
    for (let i = 0; i < 5; i += 1) tone(c, { f0: 1200 + i * 120, at: 1.9 + i * 0.09, dur: 0.07, type: 'triangle', vol: 0.03 });
    return true;
  } catch {
    return false;
  }
}

export function playSfx(name) {
  if (!soundEnabled()) return;
  try {
    const c = getCtx();
    if (c && SOUNDS[name]) SOUNDS[name](c);
  } catch {
    /* ovoz muhim emas */
  }
}
