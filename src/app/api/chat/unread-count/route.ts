import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ count: 0, contactIds: [] });

  try {
    const { data, error } = await db
      .from('unread_counts_view')
      .select('contact_id, unread_count')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[unread-count API error]:', error.message);
      return NextResponse.json({ count: 0, contactIds: [] });
    }

    const unreadRows = (data || []).filter((r: any) => (r.unread_count || 0) > 0);
    const unreadCount = unreadRows.length; // Number of UNREAD CONVERSATIONS
    const contactIds = unreadRows.map((r: any) => r.contact_id);

    return NextResponse.json({ count: unreadCount, contactIds });
  } catch (err: any) {
    console.error('[unread-count exception]:', err);
    return NextResponse.json({ count: 0, contactIds: [] });
  }
}
