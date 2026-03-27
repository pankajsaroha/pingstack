import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const { data: contacts, error } = await db
      .from('group_contacts')
      .select('contact_id, contacts(*)')
      .eq('group_id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Flatten the result
    const flattened = contacts?.map((c: any) => c.contacts) || [];

    return NextResponse.json(flattened);
  } catch (err: any) {
    console.error('Fetch Group Contacts Error:', err);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: groupId } = await params;
  const { contactId, contactIds } = await req.json();

  if (!contactId && (!contactIds || contactIds.length === 0)) {
    return NextResponse.json({ error: 'Contact ID(s) required' }, { status: 400 });
  }

  const idsToRemove = contactIds || [contactId];

  try {
    const { error } = await db
      .from('group_contacts')
      .delete()
      .eq('group_id', groupId)
      .in('contact_id', idsToRemove)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Remove Contact from Group Error:', err);
    return NextResponse.json({ error: 'Failed to remove contact' }, { status: 500 });
  }
}
