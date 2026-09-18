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
    const userId = req.headers.get('x-user-id');

    if (userId && unreadRows.length > 0) {
      const { getEffectiveWorkspaceRole, getUserTeamIdsServer, getConversationAssignmentsServer } = await import('@/lib/server/teams');
      const role = await getEffectiveWorkspaceRole(userId, tenantId);
      if (role !== 'admin') {
        const userTeamIds = await getUserTeamIdsServer(userId, tenantId);
        const candidateContactIds = unreadRows.map((r: any) => r.contact_id);
        const assignmentsMap = await getConversationAssignmentsServer(tenantId, candidateContactIds);

        const authorizedUnreadRows = unreadRows.filter((r: any) => {
          const a = assignmentsMap.get(r.contact_id);
          if (a && a.team_id) {
            return a.assigned_user_id === userId || userTeamIds.includes(a.team_id);
          }
          if (a && a.assigned_user_id && !a.team_id) {
            return a.assigned_user_id === userId;
          }
          return true; // pure unassigned
        });

        return NextResponse.json({
          count: authorizedUnreadRows.length,
          contactIds: authorizedUnreadRows.map((r: any) => r.contact_id)
        });
      }
    }

    const unreadCount = unreadRows.length; // Number of UNREAD CONVERSATIONS
    const contactIds = unreadRows.map((r: any) => r.contact_id);

    return NextResponse.json({ count: unreadCount, contactIds });
  } catch (err: any) {
    console.error('[unread-count exception]:', err);
    return NextResponse.json({ count: 0, contactIds: [] });
  }
}
