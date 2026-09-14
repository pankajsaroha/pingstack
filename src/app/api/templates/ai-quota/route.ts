import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAiTemplateQuota } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  try {
    const quota = await getAiTemplateQuota(tenantId);
    return NextResponse.json({
      success: true,
      quota
    });
  } catch (err: any) {
    console.error('[AI Quota API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
