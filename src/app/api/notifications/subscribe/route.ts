import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { VAPID_PUBLIC_KEY } from '@/lib/server/push-notifications';

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const tenantId = reqHeaders.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      vapidPublicKey: VAPID_PUBLIC_KEY,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const tenantId = reqHeaders.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.subscription || !body.subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    const { endpoint, keys } = body.subscription;
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;
    const userAgent = body.userAgent || req.headers.get('user-agent') || 'Unknown';

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Missing encryption keys in subscription' }, { status: 400 });
    }

    const subData = { endpoint, p256dh, auth, userAgent, tenantId, updatedAt: new Date().toISOString() };

    // 1. Try DB persistence
    if (db) {
      try {
        const { data: existing } = await db
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', endpoint)
          .maybeSingle();

        if (existing) {
          await db
            .from('push_subscriptions')
            .update({
              tenant_id: tenantId,
              p256dh,
              auth,
              user_agent: userAgent,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await db.from('push_subscriptions').insert({
            tenant_id: tenantId,
            endpoint,
            p256dh,
            auth,
            user_agent: userAgent,
            is_active: true,
          });
        }
      } catch (dbErr) {
        console.warn('[Push Subscribe DB Warning]:', dbErr);
      }
    }

    // 2. Always persist in Redis hash for resilience
    try {
      await connection.hset(`push:subs:${tenantId}`, endpoint, JSON.stringify(subData));
    } catch (redisErr) {
      console.warn('[Push Subscribe Redis Warning]:', redisErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push Subscription Save Error]:', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const reqHeaders = await headers();
    const tenantId = reqHeaders.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const endpoint = body?.endpoint;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    if (db) {
      try {
        await db
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint)
          .eq('tenant_id', tenantId);
      } catch {
        // ignore
      }
    }

    try {
      await connection.hdel(`push:subs:${tenantId}`, endpoint);
    } catch (redisErr) {
      console.warn('[Push Unsubscribe Redis Warning]:', redisErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push Subscription Unsubscribe Error]:', err);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
