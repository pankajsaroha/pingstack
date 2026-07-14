import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  try {
    const { id: campaignId } = await params;
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    console.log(`[Report API] Fetching page ${page} (limit: ${limit}, search: "${search}") for campaign ${campaignId} (Tenant: ${tenantId})`);

    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let query = db
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
      `, { count: 'exact' })
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId);

    if (search) {
      query = query.or(`phone_number.ilike.%${search}%,contacts.name.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(fromIndex, toIndex);

    if (error) {
      console.error(`[Report API] Query error for ${campaignId}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      totalCount: count || 0
    });
  } catch (err: unknown) {
    console.error(`[Report API] Runtime error:`, err);
    const message = err instanceof Error ? err.message : 'Failed to fetch report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
