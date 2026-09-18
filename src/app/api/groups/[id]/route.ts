import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateGroupsCache } from '@/lib/server/groups';
import { hasWorkspacePermission } from '@/lib/server/teams';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (userId) {
    const canManage = await hasWorkspacePermission(userId, tenantId, 'contacts_manage');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage groups.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }
  }

  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { id } = await params;

  try {
    const { name } = await req.json();
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 });
    }

    if (trimmedName.length > 100) {
      return NextResponse.json({ error: 'Group name must not exceed 100 characters' }, { status: 400 });
    }

    const { data, error } = await db
      .from('groups')
      .update({ name: trimmedName })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
    }

    await invalidateGroupsCache(tenantId);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update group' }, { status: 500 });
  }
}
