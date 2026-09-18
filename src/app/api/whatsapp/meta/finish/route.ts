import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { subscribeWABAWebhooks, registerMetaPhoneNumber } from '@/lib/whatsapp';
import { recordLatency } from '@/lib/server/latency-telemetry';
import { recordOnboardingRun } from '@/lib/server/onboarding-telemetry';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  if (userId) {
    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canManage = await hasWorkspacePermission(userId, tenantId, 'settings_manage');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage WhatsApp settings.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }
  }

  const startTime = performance.now();

  try {
    const { accessToken, wabaId, phoneId, portfolioId } = await req.json();

    let tokenToUse = accessToken;
    if (!tokenToUse) {
      const { data: existing } = await db
        .from('whatsapp_accounts')
        .select('access_token')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing?.access_token) {
        const { decrypt } = await import('@/lib/encryption');
        tokenToUse = decrypt(existing.access_token);
      }
    }

    if (!tokenToUse || !wabaId || !phoneId) {
      return NextResponse.json({ error: 'Missing configuration details (token, WABA ID, or Phone ID required)' }, { status: 400 });
    }

    // 1. Critical Path: Subscribe WABA to Webhooks & Register Phone Number concurrently
    const criticalStart = performance.now();
    const [subRes, regRes] = await Promise.allSettled([
      subscribeWABAWebhooks(wabaId, tokenToUse),
      registerMetaPhoneNumber(phoneId, tokenToUse)
    ]);

    let subSuccess = true;
    let regSuccess = true;

    if (subRes.status === 'rejected' || (subRes.status === 'fulfilled' && subRes.value && !subRes.value.success && subRes.value.error)) {
      console.warn('Webhook subscription warning:', subRes.status === 'rejected' ? subRes.reason : subRes.value.error);
      subSuccess = false;
    }
    if (regRes.status === 'rejected' || (regRes.status === 'fulfilled' && regRes.value && !regRes.value.success)) {
      console.warn('Phone registration warning:', regRes.status === 'rejected' ? regRes.reason : regRes.value?.error);
      regSuccess = false;
    }

    const encryptedToken = encrypt(tokenToUse);

    // 2. Prepare Consolidated Payload strictly adhering to PostgreSQL schema
    const accountPayload: Record<string, any> = {
      tenant_id: tenantId,
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    };

    // 3. Store in Database safely without relying on non-existent ON CONFLICT constraint
    const dbStart = performance.now();
    const { data: existingAccount } = await db
      .from('whatsapp_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    let dbError;
    if (existingAccount) {
      const { error } = await db
        .from('whatsapp_accounts')
        .update(accountPayload)
        .eq('id', existingAccount.id);
      dbError = error;
    } else {
      const { error } = await db
        .from('whatsapp_accounts')
        .insert(accountPayload);
      dbError = error;
    }

    if (dbError) throw dbError;

    // Invalidate cached tenant data so subsequent GET /api/tenant/me returns authoritative ACTIVE status
    await invalidateTenantCache(tenantId);

    const dbDuration = performance.now() - dbStart;
    const criticalPathDuration = performance.now() - criticalStart;

    // 4. Non-Critical Background Operations (Non-blocking background template & limits sync)
    // Run asynchronously without delaying HTTP response to user
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    setTimeout(() => {
      fetch(`${origin}/api/whatsapp/meta/templates`, {
        headers: { 'x-tenant-id': tenantId }
      }).catch(err => console.warn('[Background Template Sync] Warning:', err));

      fetch(`${origin}/api/whatsapp/meta/limits`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId }
      }).catch(err => console.warn('[Background Limits Sync] Warning:', err));
    }, 50);

    const totalDuration = performance.now() - startTime;
    recordLatency('WHATSAPP_ONBOARDING', 'finish', 'request_latency', totalDuration, false);

    // Record complete telemetry run
    await recordOnboardingRun({
      id: `onb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      totalDurationMs: Math.round(totalDuration),
      criticalPathDurationMs: Math.round(criticalPathDuration),
      stages: {
        phone_registration: {
          stage: 'phone_registration',
          startTime: criticalStart,
          endTime: criticalStart + (criticalPathDuration / 2),
          durationMs: Math.round(criticalPathDuration / 2),
          success: regSuccess
        },
        webhook_subscription: {
          stage: 'webhook_subscription',
          startTime: criticalStart,
          endTime: criticalStart + (criticalPathDuration / 2),
          durationMs: Math.round(criticalPathDuration / 2),
          success: subSuccess
        },
        db_persistence: {
          stage: 'db_persistence',
          startTime: dbStart,
          endTime: dbStart + dbDuration,
          durationMs: Math.round(dbDuration),
          success: true
        },
        total_onboarding: {
          stage: 'total_onboarding',
          startTime,
          endTime: startTime + totalDuration,
          durationMs: Math.round(totalDuration),
          success: true
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      status: 'ACTIVE',
      account: {
        id: existingAccount?.id,
        provider: 'META',
        business_id: wabaId,
        phone_number_id: phoneId,
        status: 'ACTIVE'
      },
      backgroundSync: true 
    });

  } catch (err: any) {
    console.error('Finalization Error:', err);
    const duration = performance.now() - startTime;
    recordLatency('WHATSAPP_ONBOARDING', 'finish', 'request_latency', duration, true);

    await recordOnboardingRun({
      id: `onb_err_${Date.now()}`,
      tenantId,
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      totalDurationMs: Math.round(duration),
      criticalPathDurationMs: Math.round(duration),
      failureStage: 'db_persistence',
      failureReason: err?.message || 'Finalization failed',
      stages: {
        total_onboarding: {
          stage: 'total_onboarding',
          startTime,
          endTime: startTime + duration,
          durationMs: Math.round(duration),
          success: false,
          error: err?.message
        }
      }
    });

    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
