import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { getTeamsServer } from '@/lib/server/teams';

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
        error: 'Teams feature is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const teams = await getTeamsServer(tenantId, userId || undefined);
    return NextResponse.json({ teams });
  } catch (err: any) {
    console.error('[GET /api/teams] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ 
        error: 'Teams feature is available on the Pro plan. Please upgrade to Pro to create teams.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canManageTeams = await hasWorkspacePermission(userId, tenantId, 'teams_manage');
    if (!canManageTeams) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage teams.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, color = '#4F46E5' } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const cleanName = name.trim();

    // Check duplicate team name
    const { data: existing } = await db
      .from('teams')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `A team named "${cleanName}" already exists.` }, { status: 400 });
    }

    const { data: team, error: insertErr } = await db
      .from('teams')
      .insert({
        tenant_id: tenantId,
        name: cleanName,
        description: description?.trim() || null,
        color: color || '#4F46E5',
        is_active: true
      })
      .select()
      .single();

    if (insertErr || !team) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to create team' }, { status: 500 });
    }

    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    console.error('[POST /api/teams] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
