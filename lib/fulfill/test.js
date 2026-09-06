// Test yetkazish provayderi — real B2B'siz, demo/ishlab chiqish uchun.
// buy() -> darhol "sent" (trade yuborildi), status() -> "done".

export const id = 'test';

export function configured() {
  return true;
}

export async function buy({ marketHashName }) {
  return {
    ok: true,
    providerRef: 'test-' + Math.random().toString(36).slice(2, 10),
    state: 'sent',
    detail: `test: "${marketHashName}" uchun trade offer yuborildi`,
  };
}

export async function status() {
  return { state: 'done', detail: 'test: xaridor qabul qildi' };
}
