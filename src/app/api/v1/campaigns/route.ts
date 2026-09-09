import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { generatePublicId } from '@/lib/utils';
import { isFeatureAllowed } from '@/lib/limits';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
    const offset = (page - 1) * pageSize;
    const status = url.searchParams.get('status');

    let query = db
      .from('campaigns')
      .select('id, public_id, name, template_id, status, scheduled_at, error, created_at, templates(name, language)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status);

    const { data: campaigns, count, error } = await query;
    if (error) throw error;

    const list = campaigns || [];

    // Fetch message status stats scoped to current page's campaign IDs
    let statsMap: Record<string, Record<string, number>> = {};
    if (list.length > 0) {
      const campaignIds = list.map((c: any) => c.id);
      const { data: messages } = await db
        .from('messages')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);

      (messages || []).forEach((m: any) => {
        if (!m.campaign_id) return;
        if (!statsMap[m.campaign_id]) {
          statsMap[m.campaign_id] = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
        }
        const s = m.status || 'unknown';
        statsMap[m.campaign_id][s] = (statsMap[m.campaign_id][s] || 0) + 1;
      });
    }

    const result = list.map((c: any) => ({
      ...c,
      stats: statsMap[c.id] || { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    }));

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/campaigns',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(result, 200, {
      requestId,
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        hasMore: (offset + list.length) < (count || 0),
      }
    }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch campaigns', 500, { requestId }), origin);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const body = await req.json();
    const { name, template_id, template_name, scheduled_at } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return withCors(apiError('VALIDATION_ERROR', 'Campaign name is required.', 400, {
        details: [{ field: 'name', message: 'Name cannot be empty' }],
        requestId
      }), origin);
    }

    // Resolve template by ID or name
    let resolvedTemplateId = template_id;
    if (!resolvedTemplateId && template_name) {
      const { data: tpl } = await db
        .from('templates')
        .select('id')
        .eq('name', template_name)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (tpl) resolvedTemplateId = tpl.id;
    }

    if (!resolvedTemplateId) {
      return withCors(apiError('VALIDATION_ERROR', 'Valid template_id or template_name is required.', 400, {
        details: [{ field: 'template_id', message: 'Missing template reference' }],
        requestId
      }), origin);
    }

    if (scheduled_at) {
      const allowed = await isFeatureAllowed(tenantId, 'scheduled_campaigns');
      if (!allowed) {
        return withCors(apiError('FEATURE_GATED', 'Campaign scheduling is a Growth plan feature.', 403, { requestId }), origin);
      }
    }

    const publicId = generatePublicId('c');
    const { data: campaign, error } = await db
      .from('campaigns')
      .insert({
        tenant_id: tenantId,
        public_id: publicId,
        name: name.trim(),
        template_id: resolvedTemplateId,
        scheduled_at: scheduled_at || null,
        status: scheduled_at ? 'scheduled' : 'draft',
      })
      .select('id, public_id, name, template_id, status, scheduled_at, created_at')
      .single();

    if (error) throw error;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/campaigns',
      statusCode: 201,
      latencyMs: Date.now() - startTime,
      resourceType: 'campaign',
      resourceId: campaign.id,
    });

    return withCors(apiSuccess(campaign, 201, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to create campaign', 500, { requestId }), origin);
  }
}
