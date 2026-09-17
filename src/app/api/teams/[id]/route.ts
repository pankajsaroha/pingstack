import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: teamId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ error: 'Teams feature is available on the Pro plan.', code: 'PRO_REQUIRED' }, { status: 403 });
    }

    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canManageTeams = await hasWorkspacePermission(userId, tenantId, 'teams_manage');
    if (!canManageTeams) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage teams.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, color, is_active } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    const { data: updated, error } = await db
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: error?.message || 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: teamId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ error: 'Teams feature is available on the Pro plan.', code: 'PRO_REQUIRED' }, { status: 403 });
    }

    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canManageTeams = await hasWorkspacePermission(userId, tenantId, 'teams_manage');
    if (!canManageTeams) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete teams.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    // Unassign any conversations currently assigned to this team
    await db
      .from('conversation_assignments')
      .update({ team_id: null, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId);

    // Delete team record (cascades to team_members)
    const { error } = await db
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete team' }, { status: 500 });
  }
}
