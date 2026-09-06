import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getProductById, updateProduct, deleteProduct } from '@/lib/productStore';

export const dynamic = 'force-dynamic';

// GET /api/products/[id]  -> bitta mahsulot (ochiq)
export async function GET(_req, { params }) {
  try {
    const item = await getProductById(params.id);
    if (!item) return NextResponse.json({ item: null }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('[api/products/[id] GET]', e.message);
    return NextResponse.json({ item: null, error: 'load_failed' }, { status: 200 });
  }
}

// PUT /api/products/[id]  -> tahrirlash (faqat admin)
export async function PUT(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  try {
    const result = await updateProduct(params.id, body);
    if (result.error) {
      const code = result.error === 'Topilmadi' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status: code });
    }
    return NextResponse.json({ item: result.item });
  } catch (e) {
    console.error('[api/products/[id] PUT]', e.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

// DELETE /api/products/[id]  -> o'chirish (faqat admin)
export async function DELETE(_req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const result = await deleteProduct(params.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/products/[id] DELETE]', e.message);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
