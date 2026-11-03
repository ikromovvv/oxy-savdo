import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { giveawayEnabled, isSubscribed, tgCall } from '@/lib/giveawayBot';
import { isEligible, listEntries, listWinners, recordWinner, setSubscribed } from '@/lib/giveawayStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const publicEntry = (e) => ({
  tgId: e.tgId,
  tgUsername: e.tgUsername,
  tgName: e.tgName,
  steamid: e.steamid,
  steamName: e.steamName,
  subscribed: e.subscribed,
  eligible: isEligible(e),
});

// GET — ishtirokchilar soni va g'oliblar (faqat admin)
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const entries = await listEntries();
  return NextResponse.json({
    configured: giveawayEnabled(),
    total: entries.length,
    eligible: entries.filter(isEligible).length,
    entries: entries.slice(0, 200).map(publicEntry),
    winners: await listWinners(),
  });
}

// POST { action: 'draw' } — g'olibni tanlash. Tanlashdan oldin har bir nomzodning obunasi
// QAYTA tekshiriladi (obunani bekor qilganlar chiqib ketadi).
export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'draw') return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  if (!giveawayEnabled()) return NextResponse.json({ error: 'giveaway_not_configured' }, { status: 503 });

  const candidates = (await listEntries()).filter((e) => e.steamid);
  const valid = [];
  for (const e of candidates) {
    let sub = e.subscribed;
    try {
      sub = await isSubscribed(e.tgId);
      if (sub !== e.subscribed) await setSubscribed(e.tgId, sub);
    } catch {
      // tekshirib bo'lmasa — oxirgi ma'lum holat
    }
    if (sub) valid.push({ ...e, subscribed: true });
  }
  if (!valid.length) return NextResponse.json({ error: 'no_eligible' }, { status: 409 });

  const pick = valid[Math.floor(Math.random() * valid.length)];
  await recordWinner({ tgId: pick.tgId, steamid: pick.steamid, note: `${valid.length} nomzoddan` });
  if (body.notify) {
    tgCall('sendMessage', { chat_id: pick.tgId, text: "🎉 Tabriklaymiz! Siz OXY SAVDO rozigrishida g'olib bo'ldingiz. Admin siz bilan bog'lanadi." }).catch(() => {});
  }
  return NextResponse.json({ ok: true, winner: publicEntry(pick), pool: valid.length });
}
