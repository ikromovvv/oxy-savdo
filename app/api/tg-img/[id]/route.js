import { hasFileId } from '@/lib/tgStore';

export const dynamic = 'force-dynamic';

// GET /api/tg-img/<file_id> — webhook orqali kelgan postlarning rasmi.
// Bot tokeni mijozga chiqmasligi uchun rasm server orqali uzatiladi. Faqat bazadagi
// e'lonlarga tegishli file_id lar uchun ishlaydi (ochiq proksi emas).
export async function GET(_req, { params }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileId = decodeURIComponent(params.id || '');
  if (!token || !fileId || !(await hasFileId(fileId))) {
    return new Response('not found', { status: 404 });
  }
  try {
    const meta = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { cache: 'no-store' }
    ).then((r) => r.json());
    const filePath = meta?.result?.file_path;
    if (!filePath) return new Response('not found', { status: 404 });

    const file = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!file.ok) return new Response('not found', { status: 404 });
    return new Response(file.body, {
      headers: {
        'content-type': file.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return new Response('error', { status: 502 });
  }
}
