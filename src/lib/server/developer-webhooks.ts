import { createHmac, randomBytes } from 'crypto';
import { dbAdmin as db } from '@/lib/db';
import { developerWebhookQueue } from '@/lib/queue';

export interface DeveloperWebhookPayload<T = any> {
  id: string;
  type: string;
  api_version: 'v1';
  created_at: string;
  data: T;
}

/**
 * Computes an HMAC-SHA256 signature for a webhook payload string
 */
export function signWebhookPayload(payloadString: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payloadString}`;
  return createHmac('sha256', secret).update(signedPayload).digest('hex');
}

/**
 * Generates a secure signing secret for a new webhook endpoint
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}

/**
 * Dispatches an outbound webhook event asynchronously for a tenant.
 * Non-blocking: fetches subscribed endpoints and enqueues jobs into BullMQ developer-webhook-queue.
 */
export async function dispatchDeveloperWebhookEvent(
  tenantId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  if (!tenantId || !db) return;

  try {
    // 1. Fetch active webhook endpoints for this tenant
    const { data: endpoints, error } = await db
      .from('developer_webhook_endpoints')
      .select('id, url, signing_secret, subscribed_events')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error || !endpoints || endpoints.length === 0) return;

    // Filter endpoints matching eventType or wildcard '*'
    const matchedEndpoints = endpoints.filter((ep: any) => {
      const subs = ep.subscribed_events || [];
      return subs.includes('*') || subs.includes(eventType);
    });

    if (matchedEndpoints.length === 0) return;

    const eventId = `evt_${randomBytes(12).toString('hex')}`;
    const payload: DeveloperWebhookPayload = {
      id: eventId,
      type: eventType,
      api_version: 'v1',
      created_at: new Date().toISOString(),
      data: eventData
    };

    // 2. Queue delivery job for each subscribed endpoint
    const jobs = matchedEndpoints.map((ep: any) => ({
      name: 'send-developer-webhook',
      data: {
        tenantId,
        endpointId: ep.id,
        url: ep.url,
        signingSecret: ep.signing_secret,
        eventType,
        eventId,
        payload
      },
      opts: {
        jobId: `wh-${ep.id}-${eventId}`,
        removeOnComplete: 1000
      }
    }));

    await developerWebhookQueue.addBulk(jobs);
    console.log(`[Developer Webhooks] Enqueued ${jobs.length} delivery jobs for event '${eventType}' (tenant ${tenantId})`);
  } catch (err: any) {
    console.warn('[Developer Webhooks Dispatch Warning]:', err?.message || err);
  }
}

/**
 * Performs actual HTTP POST delivery to the developer's endpoint
 */
export async function deliverDeveloperWebhookJob(jobData: {
  tenantId: string;
  endpointId: string;
  url: string;
  signingSecret: string;
  eventType: string;
  eventId: string;
  payload: DeveloperWebhookPayload;
}): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const { tenantId, endpointId, url, signingSecret, eventType, eventId, payload } = jobData;
  const timestamp = Date.now();
  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, signingSecret, timestamp);

  let responseStatus: number | null = null;
  let responseText: string | null = null;
  let deliveryError: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s HTTP timeout

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pingstack-Webhook/1.0',
        'X-Pingstack-Event': eventType,
        'X-Pingstack-Event-Id': eventId,
        'X-Pingstack-Timestamp': String(timestamp),
        'X-Pingstack-Signature': `v1=${signature}`,
      },
      body: payloadString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    responseStatus = res.status;
    responseText = (await res.text()).substring(0, 1000); // Record up to 1KB response

    if (!res.ok) {
      deliveryError = `HTTP ${res.status}: ${responseText || res.statusText}`;
    }
  } catch (err: any) {
    deliveryError = err?.message || String(err);
  }

  // Record delivery attempt in developer_webhook_deliveries
  if (db) {
    try {
      await db.from('developer_webhook_deliveries').insert({
        tenant_id: tenantId,
        endpoint_id: endpointId,
        event_type: eventType,
        event_id: eventId,
        payload,
        response_status: responseStatus,
        response_body: responseText,
        error: deliveryError,
      });
    } catch (logErr) {
      console.warn('[Webhook Delivery Log Warning]:', logErr);
    }
  }

  if (deliveryError) {
    throw new Error(`Webhook delivery failed: ${deliveryError}`);
  }

  return { success: true, statusCode: responseStatus || 200 };
}
