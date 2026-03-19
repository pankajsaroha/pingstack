import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, contactIds } = await req.json();
  if (!groupId || !Array.isArray(contactIds)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const payload = contactIds.map(id => ({
    tenant_id: tenantId,
    group_id: groupId,
    contact_id: id
  }));

  const { error } = await db.from('group_contacts').upsert(payload, { onConflict: 'group_id,contact_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
