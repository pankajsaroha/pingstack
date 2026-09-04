import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '30', 10)));
    const offset = (page - 1) * limit;

    const { data: logs, count, error } = await db
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // If table doesn't exist yet, return empty list gracefully
      return NextResponse.json({
        logs: [],
        pagination: { total: 0, page: 1, limit, totalPages: 1 },
      });
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error('[Admin Audit Logs API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
