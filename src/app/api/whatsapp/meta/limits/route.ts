import { NextResponse } from 'next/server';
import { getEffectiveMessagingCapacity } from '@/lib/server/meta-limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized: missing tenant ID' }, { status: 401 });
  }

  try {
    const capacity = await getEffectiveMessagingCapacity(tenantId, false);
    return NextResponse.json({ success: true, capacity });
  } catch (err: any) {
    console.error('[WhatsApp Meta Limits API] GET error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch messaging capacity' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized: missing tenant ID' }, { status: 401 });
  }

  try {
    // Force live refresh from Meta Graph API
    const capacity = await getEffectiveMessagingCapacity(tenantId, true);
    return NextResponse.json({ success: true, capacity, refreshed: true });
  } catch (err: any) {
    console.error('[WhatsApp Meta Limits API] POST sync error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to sync messaging capacity' }, { status: 500 });
  }
}
