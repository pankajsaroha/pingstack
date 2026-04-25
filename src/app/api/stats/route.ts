import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Count Templates by Status
    const { data: templates } = await db
      .from('templates')
      .select('status')
      .eq('tenant_id', tenantId);

    const approvedTemplates = templates?.filter((t: any) => t.status === 'APPROVED').length || 0;

    // 2. Count Total Contacts (Fixes 0 issue)
    const { count: totalContacts } = await db
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // 3. Aggregate Message Statuses
    const { data: messages } = await db
      .from('messages')
      .select('status, contact_id, direction')
      .eq('tenant_id', tenantId);

    const stats = {
      totalContacts: totalContacts || 0,
      conversations: Array.from(new Set((messages || []).map((m: any) => m.contact_id))).length || 0,
      templatesApproved: approvedTemplates,
      inboundMessages: (messages || []).filter((m: any) => m.direction === 'inbound').length || 0,
      sent: (messages || []).filter((m: any) => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length || 0,
      delivered: (messages || []).filter((m: any) => m.status === 'delivered' || m.status === 'read').length || 0,
      read: (messages || []).filter((m: any) => m.status === 'read').length || 0,
      failed: (messages || []).filter((m: any) => m.status === 'failed').length || 0
    };

    return NextResponse.json(stats);
  } catch (err: any) {
    console.error('Stats Error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
