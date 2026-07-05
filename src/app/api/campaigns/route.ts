import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePublicId } from '@/lib/utils';

type CreateCampaignBody = {
  name?: string;
  template_id?: string;
  scheduled_at?: string | null;
};

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    // 1. Fetch campaigns
    const { data: campaigns, error: cErr } = await db
      .from('campaigns')
      .select('*, templates(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    const list = campaigns || [];

    // 2. Fetch all message statuses linked to campaigns for this tenant
    const { data: messages, error: mErr } = await db
      .from('messages')
      .select('campaign_id, status')
      .eq('tenant_id', tenantId)
      .not('campaign_id', 'is', null);

    if (mErr) {
      console.error('[Campaigns List API] Failed to fetch message stats:', mErr);
    }

    // 3. Accumulate stats per campaign
    const statsMap: Record<string, Record<string, number>> = {};
    (messages || []).forEach((m: any) => {
      const campId = m.campaign_id;
      if (!campId) return;
      if (!statsMap[campId]) {
        statsMap[campId] = { sent: 0, delivered: 0, read: 0, failed: 0 };
      }
      const status = m.status || 'unknown';
      statsMap[campId][status] = (statsMap[campId][status] || 0) + 1;
    });

    // 4. Merge stats inline
    const result = list.map((c: any) => ({
      ...c,
      stats: statsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 }
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Campaigns GET handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { name, template_id, scheduled_at } = await req.json() as CreateCampaignBody;
  if (!name || !template_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const publicId = generatePublicId('c');
  const { data, error } = await db.from('campaigns')
    .insert({ tenant_id: tenantId, public_id: publicId, name, template_id, scheduled_at, status: 'draft' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
