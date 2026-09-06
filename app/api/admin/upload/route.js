import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isAdmin } from '@/lib/adminAuth';
import { kvEnabled, kvSet } from '@/lib/kv';

export const dynamic = 'force-dynamic';

// KV rejimida (Vercel) rasm bazaga base64 sifatida yoziladi -> 1 MB REST limiti.
// Lokalda public/products/ ga fayl sifatida yoziladi -> cheklov yumshoqroq.
const MAX_KV = 900 * 1024; // ~900 KB xom
const MAX_LOCAL = 6 * 1024 * 1024; // 6 MB

const EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let file;
  try {
    const form = await req.formData();
    file = form.get('file');
  } catch {
    return NextResponse.json({ error: 'Fayl yuborilmadi' }, { status: 400 });
  }
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
  }

  const type = file.type || '';
  if (!EXT[type]) {
    return NextResponse.json({ error: 'Faqat JPG, PNG, WebP, GIF yoki AVIF' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomBytes(8).toString('hex');

  if (kvEnabled) {
    if (buf.length > MAX_KV) {
      return NextResponse.json(
        {
          error:
            'Rasm juda katta (max ~900 KB). Rasmni siqing yoki tashqi havola (URL) kiriting.',
        },
        { status: 413 }
      );
    }
    const dataUri = `data:${type};base64,${buf.toString('base64')}`;
    await kvSet(`oxy:img:${id}`, dataUri);
    return NextResponse.json({ url: `/api/img/${id}` });
  }

  if (buf.length > MAX_LOCAL) {
    return NextResponse.json({ error: 'Rasm juda katta (max 6 MB)' }, { status: 413 });
  }
  const dir = path.join(process.cwd(), 'public', 'products');
  await fs.mkdir(dir, { recursive: true });
  const name = `${id}.${EXT[type]}`;
  await fs.writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/products/${name}` });
}
