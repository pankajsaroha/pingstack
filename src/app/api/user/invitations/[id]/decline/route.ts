import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId || !db) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: invitationId } = await params;

  try {
    // 1. Resolve authenticated user
    const { data: user, error: userErr } = await db
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();

    if (userErr || !user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // 2. Fetch invitation
    const { data: invitation, error: invErr } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // 3. Security: Email matching validation
    if (invitation.email.toLowerCase().trim() !== cleanEmail) {
      return NextResponse.json(
        { error: 'This invitation does not belong to your account.', code: 'EMAIL_MISMATCH' },
        { status: 403 }
      );
    }

    // 4. Mark invitation as declined / revoked
    await db
      .from('workspace_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);

    return NextResponse.json({ success: true, message: 'Invitation declined successfully' });
  } catch (err: any) {
    console.error('[POST /api/user/invitations/[id]/decline] error:', err);
    return NextResponse.json({ error: 'Failed to decline invitation' }, { status: 500 });
  }
}
