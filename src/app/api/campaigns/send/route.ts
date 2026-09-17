import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignQueue } from '@/lib/queue';
import { validatePayloadSize, validateCampaignSendPayload } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';
import { checkTemplateSendLimit, isFeatureAllowed } from '@/lib/limits';

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

    const { campaignId, groupIds, contactIds, directData, templateVariables, scheduledAt } = validation.data;

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

    if (userId) {
      const { hasWorkspacePermission } = await import('@/lib/server/teams');
      const canSendCampaign = await hasWorkspacePermission(userId, tenantId, 'campaigns_send');
      if (!canSendCampaign) {
        return NextResponse.json({ 
          error: 'Forbidden: You do not have permission to send campaigns.',
          code: 'PERMISSION_DENIED'
        }, { status: 403 });
      }
    }

    // 2.1 Daily Template Send Limit & Meta Capacity Pre-Flight Check
    const canSend = await checkTemplateSendLimit(tenantId, 1);
    if (!canSend) {
      return NextResponse.json({ 
        error: 'Daily template send limit reached for your plan. Please upgrade to Growth for 500 sends/day.',
        code: 'LIMIT_EXCEEDED'
      }, { status: 403 });
    }

    // 2.1.1 Meta Provider Capacity Pre-Flight Inspection
    let metaCapacityWarning: string | null = null;
    try {
      const { getEffectiveMessagingCapacity } = await import('@/lib/server/meta-limits');
      const capacity = await getEffectiveMessagingCapacity(tenantId);
      const estimatedCount = (contactIds?.length || 0) + (directData?.length || 0);

      if (
        capacity.meta.limit !== null &&
        capacity.meta.remainingRecipients !== null &&
        estimatedCount > capacity.meta.remainingRecipients
      ) {
        metaCapacityWarning = `Campaign targets ~${estimatedCount} recipients, but Meta portfolio capacity has ${capacity.meta.remainingRecipients} remaining recipient slots in the rolling 24-hour window (Tier: ${capacity.meta.tier}).`;
      }
    } catch {
      // Non-blocking fallback
    }

    // 2.2 Scheduled Campaign Plan Entitlement & Validation
    let delayMs = 0;
    let targetStatus = 'running';

    if (scheduledAt) {
      const allowed = await isFeatureAllowed(tenantId, 'scheduled_campaigns');
      if (!allowed) {
        return NextResponse.json({
          error: 'Campaign scheduling is a Growth plan feature. Please upgrade to Growth or Pro to schedule campaigns.',
          code: 'FEATURE_GATED'
        }, { status: 403 });
      }

      const scheduledTimestamp = new Date(scheduledAt).getTime();
      const now = Date.now();

      if (isNaN(scheduledTimestamp) || scheduledTimestamp <= now) {
        return NextResponse.json({
          error: 'Scheduled time must be in the future.',
          code: 'INVALID_SCHEDULE_TIME'
        }, { status: 400 });
      }

      delayMs = Math.max(0, scheduledTimestamp - now);
      targetStatus = 'scheduled';
    }

    // 3. Update campaign status in database
    await db
      .from('campaigns')
      .update({
        status: targetStatus,
        scheduled_at: scheduledAt || null,
        error: null
      })
      .eq('id', campaignId)
      .eq('tenant_id', tenantId);

    // 4. Queue the campaign processing job in Redis campaign-queue
    const queueOptions: { delay?: number; jobId?: string } = {
      jobId: `campaign-${campaignId}`
    };

    if (delayMs > 0) {
      queueOptions.delay = delayMs;
    }

    await campaignQueue.add(
      'process-campaign',
      {
        tenantId,
        campaignId,
        groupIds,
        contactIds,
        directData,
        templateVariables
      },
      queueOptions
    );

    // 5. Audit log event
    await logAuditEvent({
      tenantId,
      userId,
      action: scheduledAt ? 'CAMPAIGN_SCHEDULE' : 'CAMPAIGN_SEND',
      resource: `campaign:${campaignId}`,
      details: {
        campaignName: campaign.name,
        scheduledAt: scheduledAt || null,
        delayMs,
        groupCount: groupIds?.length || 0,
        contactCount: contactIds?.length || 0,
        directRowCount: directData?.length || 0
      }
    });

    return NextResponse.json({
      success: true,
      status: targetStatus === 'scheduled' ? 'scheduled' : 'queued',
      scheduledAt: scheduledAt || null,
      metaWarning: metaCapacityWarning || undefined,
      message: scheduledAt 
        ? `Campaign successfully scheduled for ${scheduledAt}` 
        : 'Campaign processing has been scheduled in the background.'
    });
  } catch (err: any) {
    console.error('[Campaign Send Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

