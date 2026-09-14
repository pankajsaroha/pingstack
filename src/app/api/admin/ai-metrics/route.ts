import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { getAiTemplateMetrics } from '@/lib/server/ai-metrics';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;

  try {
    const metrics = await getAiTemplateMetrics();
    return NextResponse.json({ metrics });
  } catch (err: any) {
    console.error('[Admin AI Metrics API] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch AI template metrics' }, { status: 500 });
  }
}
