import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/adminAuth';
import { getFavorites, setFavorite } from '@/lib/lisFavorites';

export const dynamic = 'force-dynamic';

// GET  — { names: string[] }
// POST { name, on } — sevimlilarga qo'shadi / olib tashlaydi
export async function GET() {
  const a = currentAdmin();
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ names: await getFavorites(a.id) });
}

export async function POST(req) {
  const a = currentAdmin();
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const names = await setFavorite(body.name, body.on !== false, a.id);
    return NextResponse.json({ ok: true, names });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
