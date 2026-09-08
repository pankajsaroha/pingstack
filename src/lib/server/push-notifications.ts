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
  messageId?: string;
  whatsappMessageId?: string;
  senderName?: string;
  senderPhone?: string;
  messageText?: string;
}

/**
 * Send Web Push notification for inbound WhatsApp message.
 * Completely asynchronous and non-blocking.
 */
export async function sendInboundMessagePushNotification({
  tenantId,
  contactId,
  messageId,
  whatsappMessageId,
  senderName,
  senderPhone,
  messageText,
}: InboundNotificationParams): Promise<void> {
  if (!tenantId || !db) return;

  const timestamp = new Date().toISOString();
  const effectiveMsgId = messageId || whatsappMessageId;

  try {
    // 1. Fetch active subscriptions for this tenant (Database or Redis fallback)
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
      console.log(JSON.stringify({
        event: 'push_notification_decision',
        tenantId,
        messageId: effectiveMsgId || null,
        conversationId: contactId || null,
        whatsappMessageId: whatsappMessageId || effectiveMsgId || null,
        notificationEligible: true,
        suppressionReason: 'no_active_subscriptions',
        pushSubscriptionFound: false,
        dispatchAttempted: false,
        dispatchResult: 'suppressed',
        timestamp,
      }));
      return;
    }

    const displayName = senderName || senderPhone || 'Customer';
    const title = 'PingStack';
    let body = `${displayName}: ${messageText || 'Sent you a message'}`;
    if (messageText && messageText.length > 120) {
      body = `${displayName}: ${messageText.slice(0, 117)}...`;
    }

    // Authoritative workspace unread conversation count for Home Screen badge
    let unreadConversationCount = 1;
    if (db) {
      try {
        const { data: unreadRows } = await db
          .from('unread_counts_view')
          .select('contact_id, unread_count')
          .eq('tenant_id', tenantId);
        if (unreadRows && unreadRows.length > 0) {
          unreadConversationCount = unreadRows.filter((r: any) => (r.unread_count || 0) > 0).length;
        }
      } catch (countErr) {
        console.warn('[WebPush] Error fetching unread count for badge:', countErr);
      }
    }

    // Use a unique notification tag per message so iOS/Android won't silently collapse or suppress subsequent messages
    const notifTag = `whatsapp-inbound-${effectiveMsgId || `${contactId || tenantId}-${Date.now()}`}`;

    const payload = JSON.stringify({
      type: 'incoming_message',
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: notifTag,
      url: contactId ? `/inbox?contactId=${contactId}` : '/inbox',
      contactId,
      messageId: effectiveMsgId,
      tenantId,
      unreadConversationCount,
      timestamp: Date.now(),
    });

    console.log(JSON.stringify({
      event: 'push_notification_decision',
      tenantId,
      messageId: effectiveMsgId || null,
      conversationId: contactId || null,
      whatsappMessageId: whatsappMessageId || effectiveMsgId || null,
      notificationEligible: true,
      suppressionReason: null,
      pushSubscriptionFound: true,
      subscriptionCount: activeSubs.length,
      dispatchAttempted: true,
      dispatchResult: 'in_progress',
      timestamp,
    }));

    // Dispatch to all devices/subscriptions
    const deadEndpoints: string[] = [];
    const deadDbIds: string[] = [];

    await Promise.allSettled(
      activeSubs.map(async (sub) => {
        let endpointHost = 'unknown';
        let subscriptionEndpointType = 'unknown';
        try {
          const parsed = new URL(sub.endpoint);
          endpointHost = `${parsed.protocol}//${parsed.host}`;
          if (parsed.host.includes('apple')) subscriptionEndpointType = 'apns_webpush';
          else if (parsed.host.includes('google') || parsed.host.includes('fcm')) subscriptionEndpointType = 'fcm_webpush';
          else if (parsed.host.includes('windows')) subscriptionEndpointType = 'wns_webpush';
          else subscriptionEndpointType = parsed.host;
        } catch {}

        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          const response = await webPush.sendNotification(pushSubscription, payload, {
            TTL: 60, // Expire notification if device offline after 60 seconds
            urgency: 'high',
          });

          const apnsId = response.headers ? response.headers['apns-id'] : undefined;

          console.log(JSON.stringify({
            event: 'push_notification_dispatch',
            tenantId,
            messageId: effectiveMsgId || null,
            whatsappMessageId: whatsappMessageId || effectiveMsgId || null,
            subscriptionEndpointType,
            endpointHost,
            result: 'success',
            providerStatus: response.statusCode,
            apnsId,
            timestamp: new Date().toISOString(),
          }));
        } catch (err: any) {
          const statusCode = err?.statusCode || 500;
          const apnsId = err?.headers ? err.headers['apns-id'] : undefined;

          console.error(JSON.stringify({
            event: 'push_notification_dispatch',
            tenantId,
            messageId: effectiveMsgId || null,
            whatsappMessageId: whatsappMessageId || effectiveMsgId || null,
            subscriptionEndpointType,
            endpointHost,
            result: 'failure',
            providerStatus: statusCode,
            providerResponse: err?.message || 'Unknown push error',
            apnsId,
            timestamp: new Date().toISOString(),
          }));

          // If subscription has expired or is invalid (404/410), mark for removal
          if (statusCode === 404 || statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
            if (sub.id) deadDbIds.push(sub.id);
          }
        }
      })
    );

    // Clean up expired subscriptions from both DB and Redis
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
