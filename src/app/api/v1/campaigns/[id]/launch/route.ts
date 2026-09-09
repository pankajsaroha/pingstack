import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { campaignQueue } from '@/lib/queue';
import { checkTemplateSendLimit } from '@/lib/limits';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { getCachedIdempotentResponse, storeIdempotentResponse, hashRequestBody } from '@/lib/server/idempotency';
import { logApiRequest } from '@/lib/server/api-logger';
import { dispatchDeveloperWebhookEvent } from '@/lib/server/developer-webhooks';
import { normalizePhoneNumber } from '@/lib/phone';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');
  const { id } = await params;

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const rawBody = await req.json().catch(() => ({}));

    // Idempotency check
    const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key');
    const requestHash = hashRequestBody(rawBody);

    if (idempotencyKey) {
      const cached = await getCachedIdempotentResponse(tenantId, idempotencyKey, requestHash);
      if (cached.exists) {
        if (cached.mismatch) {
          return withCors(apiError('CONFLICT', 'Idempotency-Key reuse with differing request payload', 409, { requestId }), origin);
        }
        return withCors(NextResponse.json(cached.cachedResponse!.responseBody, {
          status: cached.cachedResponse!.statusCode,
          headers: { 'X-Request-Id': requestId, 'X-Idempotent-Replay': 'true' }
        }), origin);
      }
    }

    // 1. Fetch Campaign & Template
    const { data: campaign, error: cErr } = await db
      .from('campaigns')
      .select('id, name, status, template_id, templates(id, name, language, status, content)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (cErr || !campaign) {
      return withCors(apiError('NOT_FOUND', `Campaign with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    // 2. Parse Recipients from structured JSON
    const {
      contact_ids = [],
      group_ids = [],
      recipients = [], // Array of { phone, variables, name }
      template_variables = {},
    } = rawBody;

    // Convert direct recipients to worker-friendly directData shape
    const directData: any[] = [];
    if (Array.isArray(recipients)) {
      recipients.forEach((r: any) => {
        const rawPhone = r.phone || r.phone_number;
        if (rawPhone) {
          const clean = normalizePhoneNumber(String(rawPhone));
          if (clean && clean.length >= 10) {
            let rowVars: string[] = [];
            if (Array.isArray(r.variables)) {
              rowVars = r.variables;
            } else if (r.variables && typeof r.variables === 'object') {
              const sortedKeys = Object.keys(r.variables).sort((a, b) => Number(a) - Number(b));
              rowVars = sortedKeys.map(k => String(r.variables[k]));
            }
            directData.push({
              phone: clean,
              name: r.name || 'Customer',
              variables: rowVars,
            });
          }
        }
      });
    }

    const hasAudience = (contact_ids.length > 0) || (group_ids.length > 0) || (directData.length > 0);
    if (!hasAudience) {
      return withCors(apiError('VALIDATION_ERROR', 'At least one target audience source ("contact_ids", "group_ids", or "recipients") is required.', 400, {
        requestId
      }), origin);
    }

    // Estimate count and check quota
    const estimatedCount = Math.max(1, contact_ids.length + group_ids.length * 10 + directData.length);
    const canSend = await checkTemplateSendLimit(tenantId, 1);
    if (!canSend) {
      return withCors(apiError('LIMIT_EXCEEDED', 'Daily template message limit reached for your plan. Please upgrade to Growth/Pro.', 403, {
        requestId
      }), origin);
    }

    // 3. Update Campaign status to 'running'
    await db.from('campaigns').update({ status: 'running', error: null }).eq('id', id).eq('tenant_id', tenantId);

    // 4. Enqueue Campaign Processing Job into Redis BullMQ campaign-queue
    await campaignQueue.add('process-campaign', {
      tenantId,
      campaignId: id,
      groupIds: group_ids,
      contactIds: contact_ids,
      directData,
      templateVariables: template_variables,
    });

    const responsePayload = {
      campaign_id: id,
      name: campaign.name,
      status: 'running',
      queued_at: new Date().toISOString(),
      audience: {
        contact_ids_count: contact_ids.length,
        group_ids_count: group_ids.length,
        direct_recipients_count: directData.length,
      }
    };

    if (idempotencyKey) {
      await storeIdempotentResponse(tenantId, idempotencyKey, requestHash, 200, {
        success: true,
        data: responsePayload,
        request_id: requestId,
      });
    }

    dispatchDeveloperWebhookEvent(tenantId, 'campaign.started', {
      campaign_id: id,
      name: campaign.name,
      status: 'running',
    }).catch(() => null);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: `/api/v1/campaigns/${id}/launch`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'campaign',
      resourceId: id,
    });

    return withCors(apiSuccess(responsePayload, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to launch campaign', 500, { requestId }), origin);
  }
}
