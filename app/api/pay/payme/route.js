import { NextResponse } from 'next/server';
import { handlePayme } from '@/lib/pay/payme';
import { limitOr429 } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Payme Merchant API endpoint (JSON-RPC 2.0).
// Payme kabinetida "Endpoint URL" sifatida shu manzilni ko'rsating:
//   https://<domen>/api/pay/payme
export async function POST(req) {
  // suiiste'molga qarshi keng chegara — Payme'ning qayta urinishlari bundan past
  const limited = await limitOr429(req, 'pay-payme', { limit: 120, windowSec: 60 });
  if (limited) return limited;

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
