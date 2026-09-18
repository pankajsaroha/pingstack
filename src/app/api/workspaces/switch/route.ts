import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId || !db) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json({ error: 'Valid workspaceId is required' }, { status: 400 });
    }

    // 1. Fetch user record
    const { data: user, error: userErr } = await db
      .from('users')
      .select('id, email, role, tenant_id, workspace_role')
      .eq('id', userId)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cleanEmail = (user.email || '').toLowerCase().trim();

    // 2. Server-side membership authorization check
    const isPrimaryWorkspace = user.tenant_id === workspaceId && user.workspace_role !== 'removed' && user.workspace_role !== 'inactive' && user.workspace_role !== 'none';

    let hasAcceptedInvitation = false;
    if (!isPrimaryWorkspace && cleanEmail) {
      const { data: invite } = await db
        .from('workspace_invitations')
        .select('id')
        .eq('tenant_id', workspaceId)
        .eq('email', cleanEmail)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

      hasAcceptedInvitation = !!invite;
    }

    // Check team_members as an additional membership verification fallback
    let hasTeamMembership = false;
    if (!isPrimaryWorkspace && !hasAcceptedInvitation) {
      const { data: tm } = await db
        .from('team_members')
        .select('id')
        .eq('tenant_id', workspaceId)
        .eq('user_id', userId)
        .limit(1);

      hasTeamMembership = Array.isArray(tm) && tm.length > 0;
    }

    const isAuthorized = isPrimaryWorkspace || hasAcceptedInvitation || hasTeamMembership;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not a member of this workspace.', code: 'UNAUTHORIZED_WORKSPACE' },
        { status: 403 }
      );
    }

    // 3. Verify target tenant exists and is active
    const { data: targetTenant, error: tenantErr } = await db
      .from('tenants')
      .select('id, name')
      .eq('id', workspaceId)
      .maybeSingle();

    if (tenantErr || !targetTenant) {
      return NextResponse.json({ error: 'Target workspace not found.' }, { status: 404 });
    }

    // 4. Generate new JWT session token scoped to the target workspace
    const token = await signToken({
      userId: user.id,
      tenantId: workspaceId,
      role: user.role || 'user'
    });

    // Invalidate stale tenant cache
    await invalidateTenantCache(workspaceId);

    const isSecure = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      workspaceId,
      workspaceName: targetTenant.name,
      token
    });

    response.cookies.set('token', token, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('[POST /api/workspaces/switch] error:', err);
    return NextResponse.json({ error: 'Failed to switch workspace' }, { status: 500 });
  }
}
