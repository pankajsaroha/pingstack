import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';

export async function GET(req: Request) {
  if (!db) return NextResponse.json({ valid: false, error: 'Database client unavailable' }, { status: 500 });

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ valid: false, error: 'Invalid or missing invitation token.' }, { status: 400 });
  }

  try {
    const { data: invitation, error } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This invitation is invalid, expired, or has already been used.' 
      }, { status: 404 });
    }

    // Fetch tenant name
    const { data: tenant } = await db
      .from('tenants')
      .select('id, name')
      .eq('id', invitation.tenant_id)
      .maybeSingle();

    // Fetch team names if any assigned
    let assignedTeams: { id: string; name: string; color?: string }[] = [];
    if (Array.isArray(invitation.team_ids) && invitation.team_ids.length > 0) {
      const { data: teamsData } = await db
        .from('teams')
        .select('id, name, color')
        .in('id', invitation.team_ids)
        .eq('tenant_id', invitation.tenant_id);
      assignedTeams = teamsData || [];
    }

    // Check if user already has an existing PingStack account
    const { data: existingUser } = await db
      .from('users')
      .select('id, name, email')
      .eq('email', invitation.email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        workspaceId: invitation.tenant_id,
        workspaceName: tenant?.name || 'PingStack Workspace',
        teams: assignedTeams,
        expiresAt: invitation.expires_at,
        isExistingUser: Boolean(existingUser),
        existingUserName: existingUser?.name || null
      }
    });
  } catch (err: any) {
    console.error('[GET /api/team-members/invite/validate] Error:', err);
    return NextResponse.json({ valid: false, error: 'Failed to validate invitation.' }, { status: 500 });
  }
}
