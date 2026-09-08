import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAutomationQuota, isFeatureAllowed } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const quota = await getAutomationQuota(tenantId);

    const { data: rules, error } = await db
      .from('automation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      // Return empty rules with quota if table is being created
      return NextResponse.json({ rules: [], quota });
    }

    return NextResponse.json({
      rules: rules || [],
      quota
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    // 1. Check Plan Quota
    const quota = await getAutomationQuota(tenantId);
    if (quota.maxRules === 0) {
      return NextResponse.json({
        error: 'Automations are not available on the Starter plan. Please upgrade to Growth or Pro to create auto-replies.',
        code: 'FEATURE_GATED'
      }, { status: 403 });
    }

    if (quota.remainingQuota <= 0) {
      return NextResponse.json({
        error: `Automation rule limit reached (${quota.maxRules} rules) for your ${quota.planType.toUpperCase()} plan. Please upgrade to Pro for unlimited automations.`,
        code: 'LIMIT_EXCEEDED'
      }, { status: 403 });
    }

    const body = await req.json();
    const { name, trigger_type, trigger_config, conditions, actions, is_active } = body;

    if (!name || !trigger_type) {
      return NextResponse.json({ error: 'Name and trigger_type are required' }, { status: 400 });
    }

    // 2. Validate Pro-only Advanced Features
    if (Array.isArray(conditions) && conditions.length > 0 && !quota.isAdvanced) {
      return NextResponse.json({
        error: 'Multi-condition filtering is an Advanced Automation feature available on Pro. Please upgrade to Pro or remove conditions.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const { data, error } = await db
      .from('automation_rules')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        trigger_type,
        trigger_config: trigger_config || {},
        conditions: Array.isArray(conditions) ? conditions : [],
        actions: Array.isArray(actions) ? actions : [],
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Automation Create Route Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
