import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { getTeamManagementDataServer } from '@/lib/server/teams';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({
        teams: [],
        members: [],
        invitations: [],
        error: 'Team members feature is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const data = await getTeamManagementDataServer(tenantId, userId || undefined);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[GET /api/team-members] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch team members' }, { status: 500 });
  }
}
