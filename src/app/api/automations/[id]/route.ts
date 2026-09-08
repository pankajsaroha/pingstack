import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAutomationQuota } from '@/lib/limits';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, trigger_type, trigger_config, conditions, actions, is_active } = body;

    const quota = await getAutomationQuota(tenantId);
    if (Array.isArray(conditions) && conditions.length > 0 && !quota.isAdvanced) {
      return NextResponse.json({
        error: 'Multi-condition filtering is an Advanced Automation feature available on Pro.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updatePayload.name = name.trim();
    if (trigger_type !== undefined) updatePayload.trigger_type = trigger_type;
    if (trigger_config !== undefined) updatePayload.trigger_config = trigger_config;
    if (conditions !== undefined) updatePayload.conditions = conditions;
    if (actions !== undefined) updatePayload.actions = actions;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await db
      .from('automation_rules')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { id } = await params;
    const { error } = await db
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
