import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasWorkspacePermission } from '@/lib/server/teams';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (userId) {
    const canView = await hasWorkspacePermission(userId, tenantId, 'contacts_view');
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view group contacts.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }
  }

  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const groupIdsParam = searchParams.get('groupIds');
  const groupIds = groupIdsParam ? groupIdsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (groupIds.length === 0) {
    return NextResponse.json({});
  }

  try {
    // Single consolidated query to fetch all contacts across all requested groups
    const { data: records, error } = await db
      .from('group_contacts')
      .select('group_id, contact_id, contacts(*)')
      .in('group_id', groupIds)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const groupMap: Record<string, any[]> = {};
    groupIds.forEach((gid) => {
      groupMap[gid] = [];
    });

    (records || []).forEach((row: any) => {
      if (row.group_id && row.contacts) {
        if (!groupMap[row.group_id]) {
          groupMap[row.group_id] = [];
        }
        groupMap[row.group_id].push(row.contacts);
      }
    });

    return NextResponse.json(groupMap, {
      headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=45' }
    });
  } catch (err: any) {
    console.error('Fetch Batch Group Contacts Error:', err);
    return NextResponse.json({ error: 'Failed to fetch group contacts' }, { status: 500 });
  }
}
