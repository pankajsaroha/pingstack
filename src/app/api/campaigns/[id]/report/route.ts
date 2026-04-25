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

  try {
    const { id: campaignId } = await params;
    console.log(`[Report API] Fetching for campaign ${campaignId} (Tenant: ${tenantId})`);

    const { data, error } = await db
      .from('messages')
      .select(`
        id,
        phone_number,
        status,
        created_at,
        direction,
        variables,
        contacts (
          name
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[Report API] Query error for ${campaignId}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`[Report API] Runtime error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
