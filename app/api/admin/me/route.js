import { NextResponse } from 'next/server';
import { currentAdmin, adminPasswordConfigured } from '@/lib/adminAuth';
import { activeProvider } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

export async function GET() {
  const a = currentAdmin();
  return NextResponse.json({
    admin: Boolean(a),
    configured: adminPasswordConfigured(),
    ...(a ? { provider: activeProvider(), name: a.name, lisKeyConfigured: Boolean(a.lisKey) } : {}),
  });
}
