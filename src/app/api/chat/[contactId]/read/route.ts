import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId } = await params;

  try {
    const { error } = await db
      .from('messages')
      .update({ status: 'read' })
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .eq('direction', 'inbound')
      .eq('status', 'received');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Mark as read error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
