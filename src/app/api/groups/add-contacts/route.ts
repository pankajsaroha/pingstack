import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateGroupsCache } from '@/lib/server/groups';
import { hasWorkspacePermission } from '@/lib/server/teams';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (userId) {
    const canManage = await hasWorkspacePermission(userId, tenantId, 'contacts_manage');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage group contacts.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }
  }

  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { groupId, contactIds } = await req.json();
  if (!groupId || !Array.isArray(contactIds)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const payload = contactIds.map(id => ({
    tenant_id: tenantId,
    group_id: groupId,
    contact_id: id
  }));

  const { error } = await db.from('group_contacts').upsert(payload, { onConflict: 'group_id,contact_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await invalidateGroupsCache(tenantId);

  return NextResponse.json({ success: true });
}
