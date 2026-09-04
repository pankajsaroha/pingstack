import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { logAdminAudit } from '@/lib/server/admin-audit';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type')?.trim().toLowerCase() || 'all';
    const status = searchParams.get('status')?.trim().toUpperCase() || 'all';
    const priority = searchParams.get('priority')?.trim().toLowerCase() || 'all';

    let query = db
      .from('feedback')
      .select('*, tenants(name, public_id), users(name, email)')
      .order('created_at', { ascending: false });

    if (type !== 'all') {
      query = query.eq('type', type);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority !== 'all') {
      query = query.eq('priority', priority);
    }

    const { data: feedbackItems, error } = await query;
    if (error) throw error;

    const items = (feedbackItems || []).map((f: any) => ({
      id: f.id,
      type: f.type,
      message: f.message,
      priority: f.priority || 'important',
      status: f.status || 'NEW',
      page: f.page,
      email: f.email || (Array.isArray(f.users) ? f.users[0]?.email : f.users?.email) || null,
      userName: (Array.isArray(f.users) ? f.users[0]?.name : f.users?.name) || 'User',
      businessName: (Array.isArray(f.tenants) ? f.tenants[0]?.name : f.tenants?.name) || 'Workspace',
      businessId: f.tenant_id,
      metadata: f.metadata || {},
      createdAt: f.created_at,
    }));

    // Group feature requests for "Most requested features" summary
    const featureRequests = items.filter((i: any) => i.type === 'feature' || i.type === 'suggestion');
    const featureGroupsMap = new Map<string, { topic: string; count: number; items: any[] }>();

    featureRequests.forEach((fr: any) => {
      // Clean first 5 words as a general topic bucket
      const words = fr.message.split(' ').slice(0, 5).join(' ').trim();
      const key = words.toLowerCase();
      if (!featureGroupsMap.has(key)) {
        featureGroupsMap.set(key, { topic: words, count: 0, items: [] });
      }
      const g = featureGroupsMap.get(key)!;
      g.count += 1;
      g.items.push(fr);
    });

    const topRequestedFeatures = Array.from(featureGroupsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const counts = {
      total: items.length,
      bugs: items.filter((i: any) => i.type === 'bug').length,
      features: items.filter((i: any) => i.type === 'feature').length,
      suggestions: items.filter((i: any) => i.type === 'suggestion').length,
      unread: items.filter((i: any) => i.status === 'NEW').length,
      critical: items.filter((i: any) => i.priority === 'critical').length,
    };

    return NextResponse.json({
      feedback: items,
      counts,
      topRequestedFeatures,
    });
  } catch (err: any) {
    console.error('[Admin Feedback API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db || !admin) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Feedback ID and status are required' }, { status: 400 });
    }

    const validStatuses = ['NEW', 'REVIEWED', 'PLANNED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const { data: updated, error } = await db
      .from('feedback')
      .update({ status: status.toUpperCase() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAudit({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_FEEDBACK_STATUS',
      targetTenantId: updated.tenant_id,
      metadata: { feedbackId: id, newStatus: status.toUpperCase() },
      ipAddress: req.headers.get('x-forwarded-for') || null,
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (err: any) {
    console.error('[Admin Feedback Patch API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update feedback status' }, { status: 500 });
  }
}
