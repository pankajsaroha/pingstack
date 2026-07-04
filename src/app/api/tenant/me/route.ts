import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { ensureFreshLimits } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) {
    console.error('[tenant/me] Missing x-tenant-id header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    console.error('[tenant/me] Database client is not initialized');
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  try {
    const { data: tenantData, error: tError } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (tError) {
      console.error('[tenant/me] tenant query failed', { tenantId, error: tError });
      return NextResponse.json({ error: 'Tenant lookup failed', details: tError.message }, { status: 500 });
    }

    const tenant = await ensureFreshLimits(tenantId, tenantData);

    const planType = tenant?.plan_type || 'starter';
    const pendingPlanType = tenant?.pending_plan_type || null;

    const subStatus = tenant?.subscription_status;
    const createdAt = tenant?.created_at ? new Date(tenant.created_at) : new Date();
    
    const isTrial = planType === 'starter' && subStatus !== 'active';
    const trialExpiresAt = new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const trialDaysLeft = Math.max(0, Math.ceil((trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const trialExpired = isTrial && now > trialExpiresAt;

    let userName = 'User';
    if (userId) {
      const { data: userData } = await db.from('users').select('name').eq('id', userId).maybeSingle();
      if (userData?.name) {
        userName = userData.name;
      }
    }

    const { data: whatsappAccount, error: wError } = await db.from('whatsapp_accounts')
      .select('id, provider, status, phone_number_id, business_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (wError) {
      console.error('[tenant/me] whatsapp account query failed', { tenantId, error: wError });
      return NextResponse.json({ error: 'WhatsApp account lookup failed', details: wError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...tenant,
      plan_type: planType,
      pending_plan_type: pendingPlanType,
      user_name: userName,
      is_trial: isTrial,
      trial_expires_at: trialExpiresAt.toISOString(),
      trial_days_left: trialDaysLeft,
      trial_expired: trialExpired,
      whatsapp_account: whatsappAccount || null
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tenant/me] unexpected error', { tenantId, error: message, raw: err });
    return NextResponse.json({ error: 'Unexpected server error', details: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { timezone } = body;

    const { data, error } = await db.from('tenants')
      .update({ timezone })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tenant/me PATCH] unexpected error', { tenantId, error: message, raw: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
