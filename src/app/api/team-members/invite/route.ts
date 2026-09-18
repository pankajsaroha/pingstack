import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { generateInvitationToken, hasWorkspacePermission, DEFAULT_TEAM_MEMBER_PERMISSIONS, ADMIN_PERMISSIONS } from '@/lib/server/teams';
import { sendWorkspaceInvitationEmail } from '@/lib/email-service';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ 
        error: 'Team member invitations are available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    // Strict authorization: Only users with members_manage (or Workspace Admins) can invite
    const canManageMembers = await hasWorkspacePermission(userId, tenantId, 'members_manage');
    if (!canManageMembers) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have permission to invite team members to this workspace.',
        code: 'PERMISSION_DENIED'
      }, { status: 403 });
    }

    const body = await req.json();
    const { email, role = 'member', teamIds = [], permissions } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const normalizedRole = role === 'admin' ? 'admin' : 'member';
    const effectivePermissions = normalizedRole === 'admin'
      ? ADMIN_PERMISSIONS
      : { ...DEFAULT_TEAM_MEMBER_PERMISSIONS, ...(permissions || {}) };

    // Check if user already exists in current workspace
    const { data: existingUser } = await db
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', cleanEmail)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingUser) {
      // Check if user was already assigned to the requested teams
      let allAlreadyAssigned = false;
      if (Array.isArray(teamIds) && teamIds.length > 0) {
        const { data: existingTm } = await db
          .from('team_members')
          .select('team_id')
          .eq('tenant_id', tenantId)
          .eq('user_id', existingUser.id)
          .in('team_id', teamIds);

        if (existingTm && existingTm.length === teamIds.length) {
          allAlreadyAssigned = true;
        }

        for (const tid of teamIds) {
          await db
            .from('team_members')
            .upsert({ tenant_id: tenantId, team_id: tid, user_id: existingUser.id }, { onConflict: 'team_id,user_id' });
        }
      }

      await db
        .from('users')
        .update({
          workspace_role: normalizedRole,
          permissions: effectivePermissions
        })
        .eq('id', existingUser.id)
        .eq('tenant_id', tenantId);

      const message = allAlreadyAssigned
        ? `${cleanEmail} is already a member of this team. Permissions and role have been refreshed.`
        : `${cleanEmail} is already in the workspace and has been added to the team.`;

      return NextResponse.json({
        success: true,
        message,
        isExistingMember: true,
        alreadyInTeam: allAlreadyAssigned
      });
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await db
      .from('workspace_invitations')
      .select('id, token')
      .eq('tenant_id', tenantId)
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    const token = existingInvite ? existingInvite.token : generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    if (existingInvite) {
      await db
        .from('workspace_invitations')
        .update({
          team_ids: Array.isArray(teamIds) ? teamIds : [],
          role: normalizedRole,
          permissions: effectivePermissions,
          expires_at: expiresAt
        })
        .eq('id', existingInvite.id);
    } else {
      const { error: insertErr } = await db
        .from('workspace_invitations')
        .insert({
          tenant_id: tenantId,
          email: cleanEmail,
          role: normalizedRole,
          permissions: effectivePermissions,
          team_ids: Array.isArray(teamIds) ? teamIds : [],
          token,
          invited_by: userId,
          status: 'pending',
          expires_at: expiresAt
        });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    // Fetch tenant, inviter, and team details for email template
    const [tenantRes, inviterRes, teamsRes] = await Promise.all([
      db.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
      db.from('users').select('name, email').eq('id', userId).maybeSingle(),
      Array.isArray(teamIds) && teamIds.length > 0
        ? db.from('teams').select('name, color').in('id', teamIds).eq('tenant_id', tenantId)
        : Promise.resolve({ data: [] })
    ]);

    const workspaceName = tenantRes.data?.name || 'PingStack Workspace';
    const inviterName = inviterRes.data?.name || inviterRes.data?.email || undefined;
    const assignedTeams = (teamsRes.data || []).map((t: any) => ({ name: t.name, color: t.color }));

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${origin}/invite/${token}`;

    // Dispatch invitation email via Resend
    const emailResult = await sendWorkspaceInvitationEmail({
      email: cleanEmail,
      workspaceName,
      inviterName,
      role: normalizedRole,
      teams: assignedTeams,
      inviteUrl,
      expiresAt
    });

    const isEmailSent = Boolean(emailResult.success);

    return NextResponse.json({
      success: true,
      emailSent: isEmailSent,
      emailError: emailResult.error || undefined,
      message: isEmailSent
        ? `Invitation sent successfully to ${cleanEmail}`
        : `Invitation created, but email dispatch failed (${emailResult.error || 'Check Resend configuration'}). You can copy the invite link.`,
      invitation: {
        email: cleanEmail,
        role: normalizedRole,
        permissions: effectivePermissions,
        token,
        inviteUrl,
        expiresAt
      }
    });
  } catch (err: any) {
    console.error('[POST /api/team-members/invite] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
