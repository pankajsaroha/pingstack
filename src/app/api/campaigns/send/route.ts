import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignQueue } from '@/lib/queue';
import { validatePayloadSize, validateCampaignSendPayload } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  // 0. Payload Size Check (Max 5MB)
  const sizeCheck = validatePayloadSize(req);
  if (!sizeCheck.valid && sizeCheck.response) return sizeCheck.response;

  try {
    const rawBody = await req.json();

    // 1. Strict Input Schema Validation
    const validation = validateCampaignSendPayload(rawBody);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error || 'Invalid request payload' }, { status: 400 });
    }

    const { campaignId, groupIds, contactIds, directData, templateVariables } = validation.data;

    // 2. Fetch and verify campaign belongs to this tenant (Strict Tenant Boundary RLS Check)
    const { data: campaign, error: cErr } = await db
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (cErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 404 });
    }

    // 3. Update campaign status to 'running'
    await db.from('campaigns').update({ status: 'running' }).eq('id', campaignId).eq('tenant_id', tenantId);

    // 4. Queue the campaign processing job in Redis campaign-queue
    await campaignQueue.add('process-campaign', {
      tenantId,
      campaignId,
      groupIds,
      contactIds,
      directData,
      templateVariables
    });

    // 5. Audit log event
    await logAuditEvent({
      tenantId,
      userId,
      action: 'CAMPAIGN_SEND',
      resource: `campaign:${campaignId}`,
      details: {
        campaignName: campaign.name,
        groupCount: groupIds?.length || 0,
        contactCount: contactIds?.length || 0,
        directRowCount: directData?.length || 0
      }
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
