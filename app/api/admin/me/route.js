import { NextResponse } from 'next/server';
import { isAdmin, adminPasswordConfigured } from '@/lib/adminAuth';
import { activeProvider } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = isAdmin();
  return NextResponse.json({ admin, configured: adminPasswordConfigured(), ...(admin ? { provider: activeProvider() } : {}) });
}
