import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { getWorkspaceMembersServer, getWorkspaceInvitationsServer } from '@/lib/server/teams';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({
        members: [],
        invitations: [],
        error: 'Team members feature is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const [members, invitations] = await Promise.all([
      getWorkspaceMembersServer(tenantId),
      getWorkspaceInvitationsServer(tenantId)
    ]);

    return NextResponse.json({ members, invitations });
  } catch (err: any) {
    console.error('[GET /api/team-members] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch team members' }, { status: 500 });
  }
}
