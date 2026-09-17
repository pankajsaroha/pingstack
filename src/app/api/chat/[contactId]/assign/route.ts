import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { assignConversationServer } from '@/lib/server/teams';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { contactId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ 
        error: 'Conversation assignment is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canAssign = await hasWorkspacePermission(userId, tenantId, 'inbox_assign');
    if (!canAssign) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have permission to assign or reassign conversations.',
        code: 'PERMISSION_DENIED'
      }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, assignedUserId, status = 'open' } = body;

    // Verify contact belongs to tenant
    const { data: contact } = await db
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Validate teamId if provided
    if (teamId) {
      const { data: team } = await db
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!team) {
        return NextResponse.json({ error: 'Specified team not found' }, { status: 400 });
      }
    }

    // Validate assignedUserId if provided
    if (assignedUserId) {
      const { data: user } = await db
        .from('users')
        .select('id')
        .eq('id', assignedUserId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!user) {
        return NextResponse.json({ error: 'Specified agent/user not found' }, { status: 400 });
      }
    }

    const result = await assignConversationServer({
      tenantId,
      contactId,
      teamId: teamId !== undefined ? teamId : null,
      assignedUserId: assignedUserId !== undefined ? assignedUserId : null,
      status
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to assign conversation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assignment: result.assignment
    });
  } catch (err: any) {
    console.error('[POST /api/chat/[contactId]/assign] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
