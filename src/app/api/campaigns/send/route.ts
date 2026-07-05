import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignQueue } from '@/lib/queue';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { campaignId, groupIds, contactIds, directData } = await req.json();
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

    // 1. Fetch and verify campaign exists
    const { data: campaign, error: cErr } = await db
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (cErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // 2. Instantly update campaign status to 'running'
    await db.from('campaigns').update({ status: 'running' }).eq('id', campaignId);

    // 3. Queue the campaign processing job in Redis campaign-queue
    console.log(`[Queue] Triggering background worker to process campaign ${campaignId}...`);
    await campaignQueue.add('process-campaign', {
      tenantId,
      campaignId,
      groupIds,
      contactIds,
      directData
    });

    return NextResponse.json({
      success: true,
      status: 'queued',
      message: 'Campaign processing has been scheduled in the background.'
    });
  } catch (err: any) {
    console.error('[Campaign Send Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
