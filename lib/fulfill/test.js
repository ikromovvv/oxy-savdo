// Test yetkazish provayderi — real B2B'siz, demo/ishlab chiqish uchun.
// buy() -> darhol "sent" (trade yuborildi), status() -> "done".
//
// FULFILL_TEST_MODE env bilan xatti-harakatni o'zgartirish mumkin (testlar uchun):
//   ok   (birlamchi) — buy -> sent, status -> done
//   fail            — buy -> error
//   slow            — buy -> processing, status -> done

export const id = 'test';

export function configured() {
  return true;
}

function mode() {
  return (process.env.FULFILL_TEST_MODE || 'ok').toLowerCase();
}

export async function buy({ marketHashName }) {
  if (mode() === 'fail') {
    return { ok: false, error: 'test: sotib olib bo\'lmadi', state: 'error' };
  }
  return {
    ok: true,
    providerRef: 'test-' + Math.random().toString(36).slice(2, 10),
    state: mode() === 'slow' ? 'processing' : 'sent',
    detail: `test: "${marketHashName}" uchun trade offer yuborildi`,
  };
}

export async function status() {
  if (mode() === 'fail') return { state: 'error', error: 'test: trade bekor qilindi' };
  return { state: 'done', detail: 'test: xaridor qabul qildi' };
}
