import webPush from 'web-push';
import { db } from '@/lib/db';
import { connection } from '@/lib/queue';

// VAPID keys configuration
export const VAPID_PUBLIC_KEY = 
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
  'BJkzpdmIBXxTYTwmd5Ryj6ZOAwTA_IJrm2hD9K2zUnekwoMlq_MgoJfo2veRUjTAgJLsf1RVHn4TpdsynxVFQXc';

export const VAPID_PRIVATE_KEY = 
  process.env.VAPID_PRIVATE_KEY || 
  'lwGFJvHoU7U2eM-7uCFSt_2aXU7CTwrDpCLegUbhSr0';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@pingstack.in';

try {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn('[WebPush] Failed to initialize VAPID details:', e);
}

/**
 * Check if the workspace tenant currently has any active open session / browser tab.
 * Uses Redis TTL keys with format `presence:tenant:${tenantId}:${tabId}`.
 */
export async function hasActiveWorkspaceSession(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const keys = await connection.keys(`presence:tenant:${tenantId}:*`);
    return keys && keys.length > 0;
  } catch (err) {
    console.error('[Presence] Failed to check active presence keys:', err);
    return false;
  }
}

/**
 * Record active session heartbeat for a tenant / tab.
 * TTL is 45 seconds to gracefully expire if browser closes or connection drops.
 */
export async function recordWorkspaceHeartbeat(tenantId: string, tabId: string): Promise<void> {
  if (!tenantId || !tabId) return;
  try {
    const key = `presence:tenant:${tenantId}:${tabId}`;
    await connection.set(key, 'active', 'EX', 45);
  } catch (err) {
    console.error('[Presence] Failed to record heartbeat:', err);
  }
}

/**
 * Remove active session presence on explicit logout or tab unload.
 */
export async function removeWorkspacePresence(tenantId: string, tabId: string): Promise<void> {
  if (!tenantId || !tabId) return;
  try {
    const key = `presence:tenant:${tenantId}:${tabId}`;
    await connection.del(key);
  } catch (err) {
    console.error('[Presence] Failed to delete presence key:', err);
  }
}

interface InboundNotificationParams {
  tenantId: string;
  contactId?: string;
  senderName?: string;
  senderPhone?: string;
  messageText?: string;
}

/**
 * Send Web Push notification for inbound WhatsApp message if no active workspace session is open.
 * Completely asynchronous and non-blocking.
 */
export async function sendInboundMessagePushNotification({
  tenantId,
  contactId,
  senderName,
  senderPhone,
  messageText,
}: InboundNotificationParams): Promise<void> {
  if (!tenantId || !db) return;

  try {
    // 1. WORKSPACE-LEVEL CHECK:
    // If the user currently has ANY PingStack page open in an active session, SUPPRESS push!
    const isActive = await hasActiveWorkspaceSession(tenantId);
    if (isActive) {
      // User is actively in the workspace -> push suppressed, realtime unread badge handles UI
      console.log(`[WebPush] Push dispatch skipped: Active workspace session detected for tenant ${tenantId}`);
      return;
    }

    // 2. Debounce rapid incoming messages from the same sender to avoid spam
    let debounceCount = 1;
    if (contactId) {
      try {
        const debounceKey = `push:debounce:${tenantId}:${contactId}`;
        const count = await connection.incr(debounceKey);
        if (count === 1) {
          await connection.expire(debounceKey, 20); // 20s grouping window
        }
        debounceCount = count;
      } catch {
        // Continue if redis fails
      }
    }

    // 3. Fetch active subscriptions for this tenant (Database or Redis fallback)
    let activeSubs: Array<{ id?: string; endpoint: string; p256dh: string; auth: string }> = [];

    const { data: subscriptions, error } = await db
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (!error && subscriptions && subscriptions.length > 0) {
      activeSubs = subscriptions;
    } else {
      // Redis fallback store
      try {
        const rawMap = await connection.hgetall(`push:subs:${tenantId}`);
        if (rawMap && Object.keys(rawMap).length > 0) {
          activeSubs = Object.values(rawMap).map((raw) => JSON.parse(raw));
        }
      } catch (redisErr) {
        console.warn('[WebPush] Redis subscriptions fallback error:', redisErr);
      }
    }

    if (!activeSubs || activeSubs.length === 0) {
      console.log(`[WebPush] Push dispatch skipped: No active subscriptions registered for tenant ${tenantId}`);
      return;
    }

    console.log(`[WebPush] Dispatching push notification to ${activeSubs.length} subscriptions for tenant ${tenantId}`);

    const displayName = senderName || senderPhone || 'Customer';
    let title = `New WhatsApp message`;
    let body = `${displayName}: ${messageText || 'Sent you a message'}`;

    if (debounceCount > 1) {
      title = `New WhatsApp messages`;
      body = `${displayName} sent ${debounceCount} new messages`;
    } else if (messageText && messageText.length > 90) {
      body = `${displayName}: ${messageText.slice(0, 87)}...`;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `whatsapp-inbound-${contactId || tenantId}`,
      url: contactId ? `/inbox?contactId=${contactId}` : '/inbox',
      contactId,
      tenantId,
    });

    // 4. Dispatch to all devices/subscriptions
    const deadEndpoints: string[] = [];
    const deadDbIds: string[] = [];

    await Promise.allSettled(
      activeSubs.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webPush.sendNotification(pushSubscription, payload, {
            TTL: 60, // Expire notification if device offline after 60 seconds
            urgency: 'high',
          });

          console.log(`[WebPush] Notification sent successfully to endpoint ${sub.endpoint.slice(0, 32)}...`);
        } catch (err: any) {
          // If subscription has expired or is invalid (404/410), mark for removal
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
            if (sub.id) deadDbIds.push(sub.id);
            console.log(`[WebPush] Expired subscription detected (${err.statusCode}): ${sub.endpoint.slice(0, 32)}...`);
          } else {
            console.error('[WebPush] Push dispatch failed for endpoint:', err?.message || err);
          }
        }
      })
    );

    // 5. Clean up expired subscriptions from both DB and Redis
    if (deadDbIds.length > 0) {
      try {
        await db
          .from('push_subscriptions')
          .delete()
          .in('id', deadDbIds);
        console.log(`[WebPush] Cleaned up ${deadDbIds.length} expired DB push subscriptions`);
      } catch (dbErr) {
        console.error('[WebPush] Failed to delete expired DB subscriptions:', dbErr);
      }
    }
    if (deadEndpoints.length > 0) {
      await connection.hdel(`push:subs:${tenantId}`, ...deadEndpoints).catch(() => null);
      console.log(`[WebPush] Cleaned up ${deadEndpoints.length} expired Redis subscriptions`);
    }
  } catch (err) {
    console.error('[WebPush] Unexpected error in push notification handler:', err);
  }
}
