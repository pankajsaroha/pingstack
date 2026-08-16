import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageQueue, deadLetterQueue } from '@/lib/queue';

type RetryRequestBody = {
  messageId?: string;
  messageIds?: string[];
  campaignId?: string;
  retryAllFailed?: boolean;
};

/**
 * GET /api/messages/retry
 * Inspect dead letter queue / failed messages for manual investigation.
 */
export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const campaignId = searchParams.get('campaignId');
  const offset = (page - 1) * limit;

  try {
    let query = db
      .from('messages')
      .select('*, contacts(name), campaigns(name, templates(name))', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[DLQ GET] Error fetching failed messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get count of jobs in Redis Dead Letter Queue
    let dlqCount = 0;
    try {
      dlqCount = await deadLetterQueue.getFailedCount() + await deadLetterQueue.getCompletedCount();
    } catch {
      // Redis connection issue, count from DB is primary
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      page,
      limit,
      totalCount: count || 0,
      dlqCount
    });
  } catch (err: any) {
    console.error('[DLQ GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to inspect dead letter queue' }, { status: 500 });
  }
}

/**
 * POST /api/messages/retry
 * Re-queue permanently failed messages from the Dead Letter Queue back into messageQueue for re-processing.
 */
export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const body: RetryRequestBody = await req.json().catch(() => ({}));
    const { messageId, messageIds, campaignId, retryAllFailed } = body;

    let query = db
      .from('messages')
      .select('*, campaigns(templates(name, language, content))')
      .eq('tenant_id', tenantId)
      .eq('status', 'failed');

    if (messageId) {
      query = query.eq('id', messageId);
    } else if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      query = query.in('id', messageIds);
    } else if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    } else if (!retryAllFailed) {
      return NextResponse.json(
        { error: 'Specify messageId, messageIds, campaignId, or retryAllFailed: true' },
        { status: 400 }
      );
    }

    const { data: failedMessages, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('[DLQ Retry] Fetch error:', fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!failedMessages || failedMessages.length === 0) {
      return NextResponse.json({ success: true, retriedCount: 0, message: 'No failed messages match criteria.' });
    }

    const targetIds = failedMessages.map((m: any) => m.id);

    // 1. Reset message status in DB back to 'pending'
    const { error: updateErr } = await db
      .from('messages')
      .update({ status: 'pending', error: null })
      .in('id', targetIds);

    if (updateErr) {
      console.error('[DLQ Retry] DB update status error:', updateErr);
      return NextResponse.json({ error: 'Failed to update message status' }, { status: 500 });
    }

    // 2. Build BullMQ jobs for re-queued messages
    const jobs = failedMessages.map((msg: any) => {
      const dbType = msg.message_type;
      const mediaPath = msg.media_path;
      const hasMediaPath = !!mediaPath;
      const isMedia = ['image', 'video', 'audio', 'document'].includes(dbType) || hasMediaPath;
      const templateName = (msg.campaigns?.templates as any)?.name || msg.template_name;
      const isDirectText = !templateName && !msg.campaign_id && (!isMedia && (dbType === 'text' || !dbType));

      return {
        name: 'send-whatsapp',
        data: {
          messageId: msg.id,
          phone: msg.phone_number,
          templateId: (msg.campaigns?.templates as any)?.name,
          templateLanguage: (msg.campaigns?.templates as any)?.language || 'en_US',
          params: (msg.variables || []).map((v: any) => ({ type: 'text', text: String(v) })),
          isDirectText,
          textContent: msg.content,
          isMedia,
          mediaType: isMedia ? (['image', 'video', 'audio', 'document'].includes(dbType) ? dbType : 'document') : null,
          mediaPath,
          caption: msg.content || '',
          fileName: msg.content || (mediaPath ? mediaPath.split('/').pop() : 'file')
        }
      };
    });

    console.log(`[DLQ Retry] Re-queuing ${jobs.length} failed jobs to Redis messageQueue...`);
    await messageQueue.addBulk(jobs);

    return NextResponse.json({
      success: true,
      retriedCount: jobs.length,
      message: `Successfully re-queued ${jobs.length} failed message(s) from Dead Letter Queue.`
    });

  } catch (err: any) {
    console.error('[DLQ Retry] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to retry messages from Dead Letter Queue' }, { status: 500 });
  }
}
