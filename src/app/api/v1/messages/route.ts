import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { messageQueue } from '@/lib/queue';
import { checkTemplateSendLimit, incrementTemplateSendUsage } from '@/lib/limits';
import { enforceRateLimit } from '@/lib/rate-limit';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { renderTemplateBody } from '@/lib/templates';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { getCachedIdempotentResponse, storeIdempotentResponse, hashRequestBody } from '@/lib/server/idempotency';
import { logApiRequest } from '@/lib/server/api-logger';
import { dispatchDeveloperWebhookEvent } from '@/lib/server/developer-webhooks';
import { normalizePhoneNumber } from '@/lib/phone';

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
    const phone = url.searchParams.get('phone');

    let query = db
      .from('messages')
      .select('id, contact_id, phone_number, direction, message_type, status, content, variables, provider_message_id, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status);
    if (phone) query = query.ilike('phone_number', `%${phone.replace(/\D/g, '')}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    const latencyMs = Date.now() - startTime;
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/messages',
      statusCode: 200,
      latencyMs,
    });

    return withCors(apiSuccess(data || [], 200, {
      requestId,
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        hasMore: (offset + (data?.length || 0)) < (count || 0),
      }
    }), origin);
  } catch (err: any) {
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/messages',
      statusCode: 500,
      latencyMs: Date.now() - startTime,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch messages', 500, { requestId }), origin);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');

  // 1. Authenticate Request
  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const rawBody = await req.json();

    // 2. Idempotency Check
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

    // 3. Rate Limit Check
    const limitCheck = await enforceRateLimit(tenantId, 'send_message');
    if (limitCheck.limited && limitCheck.response) {
      return withCors(limitCheck.response, origin);
    }

    // 4. Validate Request Schema
    const { to, template, variables = {}, language = 'en_US', text } = rawBody;

    if (!to) {
      return withCors(apiError('VALIDATION_ERROR', 'Recipient phone number "to" is required.', 400, {
        details: [{ field: 'to', message: 'Missing phone number' }],
        requestId
      }), origin);
    }

    const normalizedPhone = normalizePhoneNumber(String(to));
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return withCors(apiError('VALIDATION_ERROR', 'Invalid phone number. Include valid country code (e.g. 919876543210).', 400, {
        details: [{ field: 'to', message: 'Invalid phone number format' }],
        requestId
      }), origin);
    }

    // Check WhatsApp account status
    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('status, phone_number_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const isSandbox = !whatsappAccount || whatsappAccount.status !== 'ACTIVE';

    // 5. Template Message or Text Message
    const templateName = typeof template === 'object' ? template?.name : template;
    const templateLang = typeof template === 'object' ? (template?.language || language) : language;

    let resolvedContent = '';
    let positionalParams: any[] = [];
    let messageType: 'template' | 'text' = 'text';

    if (templateName) {
      messageType = 'template';

      // Daily Template Send Limit check
      const canSend = await checkTemplateSendLimit(tenantId, 1);
      if (!canSend) {
        return withCors(apiError('LIMIT_EXCEEDED', 'Daily template message limit reached for your plan. Please upgrade to Growth/Pro.', 403, {
          requestId
        }), origin);
      }

      // Lookup Template
      const { data: dbTemplate, error: tErr } = await db
        .from('templates')
        .select('id, name, language, content, status')
        .eq('name', templateName)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!dbTemplate) {
        return withCors(apiError('NOT_FOUND', `Template "${templateName}" not found in your workspace.`, 404, {
          requestId
        }), origin);
      }

      if (!isSandbox && dbTemplate.status !== 'APPROVED') {
        return withCors(apiError('VALIDATION_ERROR', `Template "${templateName}" is currently "${dbTemplate.status}". Only APPROVED templates can be sent.`, 400, {
          requestId
        }), origin);
      }

      // Convert variables to positional list
      if (Array.isArray(variables)) {
        positionalParams = variables;
      } else if (typeof variables === 'object') {
        const sortedKeys = Object.keys(variables).sort((a, b) => Number(a) - Number(b));
        positionalParams = sortedKeys.map(k => variables[k]);
      }

      resolvedContent = renderTemplateBody(dbTemplate.content, positionalParams);
    } else if (text) {
      messageType = 'text';
      resolvedContent = String(text).trim();
    } else {
      return withCors(apiError('VALIDATION_ERROR', 'Either "template" or "text" must be provided.', 400, {
        details: [{ field: 'template', message: 'Provide template object { name, language } or text body' }],
        requestId
      }), origin);
    }

    // 6. Find or auto-create contact
    let contactId: string | null = null;
    const { data: existingContact } = await db
      .from('contacts')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact } = await db
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          name: `API (${normalizedPhone})`,
          phone_number: normalizedPhone,
        })
        .select('id')
        .maybeSingle();
      if (newContact) contactId = newContact.id;
    }

    // 7. Persist message record
    const { data: msg, error: mErr } = await db
      .from('messages')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        phone_number: normalizedPhone,
        status: isSandbox ? 'sandbox' : 'pending',
        content: resolvedContent,
        direction: 'outbound',
        message_type: messageType,
        variables: positionalParams,
      })
      .select('id, created_at, status')
      .single();

    if (mErr || !msg) {
      throw new Error(`Failed to persist outbound message: ${mErr?.message}`);
    }

    // 8. Queue Sending Job into BullMQ (if live mode)
    if (!isSandbox) {
      if (messageType === 'template') {
        await messageQueue.add('send-whatsapp', {
          messageId: msg.id,
          phone: normalizedPhone,
          templateId: templateName,
          templateLanguage: templateLang,
          params: positionalParams.map(p => ({ type: 'text', text: String(p) })),
          isDirectText: false,
        });
        await incrementTemplateSendUsage(tenantId, 1);
      } else {
        await messageQueue.add('send-whatsapp', {
          messageId: msg.id,
          phone: normalizedPhone,
          textContent: resolvedContent,
          isDirectText: true,
        });
      }
    }

    const responseData = {
      message_id: msg.id,
      recipient: normalizedPhone,
      status: isSandbox ? 'sandbox_delivered' : 'queued',
      message_type: messageType,
      template: templateName || null,
      content: resolvedContent,
      created_at: msg.created_at,
      sandbox: isSandbox,
    };

    const finalResponse = apiSuccess(responseData, 201, { requestId });

    // Store Idempotency response
    if (idempotencyKey) {
      await storeIdempotentResponse(tenantId, idempotencyKey, requestHash, 201, {
        success: true,
        data: responseData,
        request_id: requestId,
      });
    }

    // Asynchronously dispatch developer webhook event
    dispatchDeveloperWebhookEvent(tenantId, 'message.sent', {
      message_id: msg.id,
      recipient: normalizedPhone,
      direction: 'outbound',
      status: isSandbox ? 'sandbox_delivered' : 'queued',
      message_type: messageType,
      created_at: msg.created_at,
    }).catch(() => null);

    const latencyMs = Date.now() - startTime;
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/messages',
      statusCode: 201,
      latencyMs,
      resourceType: 'message',
      resourceId: msg.id,
    });

    return withCors(finalResponse, origin);
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/messages',
      statusCode: 500,
      latencyMs,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to send message', 500, { requestId }), origin);
  }
}
