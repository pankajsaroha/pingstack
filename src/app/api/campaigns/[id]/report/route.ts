import { NextResponse } from 'next/server';
// Build fix: Use native db client
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: campaignId } = await params;

  const { data, error } = await db
    .from('messages')
    .select(`
      id,
      phone_number,
      status,
      updated_at,
      contacts (
        name
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('tenant_id', tenantId) // Ensure multi-tenancy security
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
