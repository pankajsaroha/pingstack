import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { Team } from '@/types';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId || !db) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Resolve authenticated user's email server-side
    const { data: user, error: userErr } = await db
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle();

    if (userErr || !user || !user.email) {
      return NextResponse.json({ invitations: [] });
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // 2. Fetch pending, unexpired invitations for this user's email
    const { data: invitations, error: invErr } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invErr || !invitations || invitations.length === 0) {
      return NextResponse.json({ invitations: [] });
    }

    // 3. Fetch tenant names and team details for all invitations
    const tenantIds = Array.from(new Set(invitations.map((i: any) => i.tenant_id)));
    const [tenantsRes, teamsRes] = await Promise.all([
      db.from('tenants').select('id, name').in('id', tenantIds),
      db.from('teams').select('*').in('tenant_id', tenantIds).eq('is_active', true)
    ]);

    const tenantMap = new Map<string, string>(
      (tenantsRes.data || []).map((t: any) => [t.id, t.name || 'PingStack Workspace'])
    );
    const teamMap = new Map<string, Team>(
      (teamsRes.data || []).map((t: any) => [t.id, t])
    );

    const formattedInvitations = invitations.map((inv: any) => {
      const teamIds: string[] = Array.isArray(inv.team_ids) ? inv.team_ids : [];
      const assignedTeams = teamIds.map((tid) => teamMap.get(tid)).filter(Boolean) as Team[];

      return {
        id: inv.id,
        token: inv.token,
        tenant_id: inv.tenant_id,
        workspace_name: tenantMap.get(inv.tenant_id) || 'PingStack Workspace',
        email: inv.email,
        role: inv.role || 'member',
        teams: assignedTeams,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        inviter_name: 'PingStack Admin'
      };
    });

    return NextResponse.json({ invitations: formattedInvitations });
  } catch (err: any) {
    console.error('[GET /api/user/invitations] error:', err);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}
