import { NextResponse } from 'next/server';
import { isAdmin, adminPasswordConfigured } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ admin: isAdmin(), configured: adminPasswordConfigured() });
}
