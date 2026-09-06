import { NextResponse } from 'next/server';
import { handlePayme } from '@/lib/pay/payme';

export const dynamic = 'force-dynamic';

// Payme Merchant API endpoint (JSON-RPC 2.0).
// Payme kabinetida "Endpoint URL" sifatida shu manzilni ko'rsating:
//   https://<domen>/api/pay/payme
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
  }

  const authHeader = req.headers.get('authorization') || '';
  const result = await handlePayme({ authHeader, body });
  return NextResponse.json(result);
}
