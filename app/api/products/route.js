import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { listProducts, createProduct } from '@/lib/productStore';

export const dynamic = 'force-dynamic';

// GET /api/products?category=kovriklar  -> ochiq ro'yxat
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'all';
  try {
    const items = await listProducts(category);
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[api/products GET]', e.message);
    return NextResponse.json({ items: [], error: 'load_failed' }, { status: 200 });
  }
}

// POST /api/products  -> yangi mahsulot (faqat admin)
export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  try {
    const result = await createProduct(body);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ item: result.item }, { status: 201 });
  } catch (e) {
    console.error('[api/products POST]', e.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
