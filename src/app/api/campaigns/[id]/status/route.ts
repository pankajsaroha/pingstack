import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Aggregate message statuses for the campaign
  const { data: stats, error: sErr } = await db.from('messages')
    .select('status')
    .eq('campaign_id', id)
    .eq('tenant_id', tenantId);
    
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  
  const summary = stats.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  return NextResponse.json(summary);
}
