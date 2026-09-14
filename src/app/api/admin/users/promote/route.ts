import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi, isPlatformAdminEmail } from '@/lib/server/admin-auth';

export async function POST(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { targetUserId, targetEmail, newRole } = body;

    if (!newRole || !['admin', 'user', 'superadmin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role. Must be "admin" or "user"' }, { status: 400 });
    }

    if (!targetUserId && !targetEmail) {
      return NextResponse.json({ error: 'targetUserId or targetEmail is required' }, { status: 400 });
    }

    // Lookup target user
    let userQuery = db.from('users').select('id, email, name, role, tenant_id');
    if (targetUserId) {
      userQuery = userQuery.eq('id', targetUserId);
    } else if (targetEmail) {
      userQuery = userQuery.eq('email', targetEmail.trim().toLowerCase());
    }

    const { data: targetUser, error: userErr } = await userQuery.maybeSingle();

    if (userErr || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Prevent demoting protected platform superadmins
    if (isPlatformAdminEmail(targetUser.email) && newRole === 'user') {
      return NextResponse.json({ error: 'Cannot demote configured platform SuperAdmin email' }, { status: 403 });
    }

    const oldRole = targetUser.role || 'user';

    // Update role
    const { error: updateErr } = await db
      .from('users')
      .update({ role: newRole })
      .eq('id', targetUser.id);

    if (updateErr) {
      console.error('[Admin Promote API] Update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    // Audit log
    try {
      await db.from('admin_audit_logs').insert({
        admin_user_id: admin.id,
        action: 'user_role_change',
        resource_type: 'user',
        resource_id: targetUser.id,
        details: {
          targetEmail: targetUser.email,
          oldRole,
          newRole,
          changedBy: admin.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (auditErr) {
      console.warn('[Admin Promote API] Audit log warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} role updated from ${oldRole} to ${newRole}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: newRole
      }
    });

  } catch (err: any) {
    console.error('[Admin Promote API] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
