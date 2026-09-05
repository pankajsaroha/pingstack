import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import webPush from 'web-push';
import { db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } from '@/lib/server/push-notifications';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@pingstack.in';

try {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn('[TestPush] Failed to initialize VAPID details:', e);
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const tenantId = reqHeaders.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized: Missing tenant session' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetSubId = body?.subscriptionId;

    // 1. Fetch subscriptions from DB or Redis
    let subscriptions: Array<{
      id?: string;
      endpoint: string;
      p256dh: string;
      auth: string;
      user_agent?: string;
    }> = [];

    if (db) {
      let query = db
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth, user_agent, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (targetSubId) {
        query = query.eq('id', targetSubId);
      }

      const { data, error } = await query;
      if (!error && data) {
        subscriptions = data;
      }
    }

    // Fallback to Redis if DB has no active subscriptions
    if (subscriptions.length === 0) {
      try {
        const rawMap = await connection.hgetall(`push:subs:${tenantId}`);
        if (rawMap && Object.keys(rawMap).length > 0) {
          subscriptions = Object.values(rawMap).map((raw) => JSON.parse(raw));
        }
      } catch (redisErr) {
        console.warn('[TestPush] Redis fallback error:', redisErr);
      }
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active push subscriptions found for this workspace. Enable notifications in the browser first.',
        tenantId,
      }, { status: 404 });
    }

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
      } catch {}
    }

    const testPayload = JSON.stringify({
      type: 'incoming_message',
      title: body?.title || 'PingStack Test',
      body: body?.body || 'Web Push delivery is working.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'pingstack-test-' + Date.now(),
      url: body?.url || '/inbox',
      tenantId,
      unreadConversationCount,
      timestamp: Date.now(),
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        let endpointHost = 'unknown';
        try {
          const parsed = new URL(sub.endpoint);
          endpointHost = `${parsed.protocol}//${parsed.host}`;
        } catch {}

        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          const response = await webPush.sendNotification(pushSub, testPayload, {
            TTL: 60,
            urgency: 'high',
          });

          const apnsId = response.headers ? response.headers['apns-id'] : undefined;

          console.log(`[TestPush] Direct test to ${endpointHost} succeeded. HTTP ${response.statusCode}, apns-id: ${apnsId || 'N/A'}`);

          return {
            subscriptionId: sub.id,
            endpointHost,
            statusCode: response.statusCode,
            apnsId,
            success: true,
            status: 'Delivered to push service',
          };
        } catch (err: any) {
          const statusCode = err?.statusCode || 500;
          const apnsId = err?.headers ? err.headers['apns-id'] : undefined;
          const rawBody = err?.body || err?.message;

          let reason = 'Push delivery failed';
          try {
            const parsedBody = JSON.parse(rawBody);
            reason = parsedBody.reason || parsedBody.error || rawBody;
          } catch {
            reason = rawBody;
          }

          console.error(`[TestPush] Direct test to ${endpointHost} failed: HTTP ${statusCode}, Reason: ${reason}`);

          return {
            subscriptionId: sub.id,
            endpointHost,
            statusCode,
            apnsId,
            reason,
            success: false,
            status: 'Failed',
          };
        }
      })
    );

    const anySuccess = results.some((r) => r.success);

    return NextResponse.json({
      success: anySuccess,
      tenantId,
      totalAttempted: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[TestPush] Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Internal test push error',
    }, { status: 500 });
  }
}
