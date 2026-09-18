import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { generateInvitationToken, hasWorkspacePermission } from '@/lib/server/teams';
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
        error: 'Team member management is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const canManageMembers = await hasWorkspacePermission(userId, tenantId, 'members_manage');
    if (!canManageMembers) {
      return NextResponse.json({
        error: 'Forbidden: You do not have permission to resend workspace invitations.',
        code: 'PERMISSION_DENIED'
      }, { status: 403 });
    }

    const body = await req.json();
    const { invitationId, email } = body;

    if (!invitationId && !email) {
      return NextResponse.json({ error: 'invitationId or email is required' }, { status: 400 });
    }

    let query = db
      .from('workspace_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (invitationId) {
      query = query.eq('id', invitationId);
    } else if (email) {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data: invitation, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !invitation) {
      return NextResponse.json({ error: 'Pending invitation not found or already accepted/revoked.' }, { status: 404 });
    }

    // Refresh token and extend expiry by 7 days
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await db
      .from('workspace_invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt,
        invited_by: userId
      })
      .eq('id', invitation.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update invitation token' }, { status: 500 });
    }

    // Fetch context for email template
    const teamIds: string[] = Array.isArray(invitation.team_ids) ? invitation.team_ids : [];
    const [tenantRes, inviterRes, teamsRes] = await Promise.all([
      db.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
      db.from('users').select('name, email').eq('id', userId).maybeSingle(),
      teamIds.length > 0
        ? db.from('teams').select('name, color').in('id', teamIds).eq('tenant_id', tenantId)
        : Promise.resolve({ data: [] })
    ]);

    const workspaceName = tenantRes.data?.name || 'PingStack Workspace';
    const inviterName = inviterRes.data?.name || inviterRes.data?.email || undefined;
    const assignedTeams = (teamsRes.data || []).map((t: any) => ({ name: t.name, color: t.color }));

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${origin}/invite/${newToken}`;

    // Re-dispatch email
    const emailResult = await sendWorkspaceInvitationEmail({
      email: invitation.email,
      workspaceName,
      inviterName,
      role: invitation.role,
      teams: assignedTeams,
      inviteUrl,
      expiresAt: newExpiresAt
    });

    const isEmailSent = Boolean(emailResult.success);

    return NextResponse.json({
      success: true,
      emailSent: isEmailSent,
      emailError: emailResult.error || undefined,
      message: isEmailSent
        ? `Invitation email resent successfully to ${invitation.email}`
        : `Invitation token refreshed, but email dispatch failed (${emailResult.error || 'Check Resend configuration'}). You can copy the invite link.`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: newToken,
        inviteUrl,
        expiresAt: newExpiresAt
      }
    });
  } catch (err: any) {
    console.error('[POST /api/team-members/invite/resend] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
