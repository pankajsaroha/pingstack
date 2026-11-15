import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type MessageStatusRow = {
  status: string | null;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { id } = await params;

  // Aggregate message statuses for the campaign (chunked to prevent 1,000-row limit truncation)
  let allStats: Array<{ status: string | null }> = [];
  let from = 0;
  const CHUNK_SIZE = 1000;

  while (true) {
    const { data: chunk, error: sErr } = await db
      .from('messages')
      .select('status')
      .eq('campaign_id', id)
      .eq('tenant_id', tenantId)
      .range(from, from + CHUNK_SIZE - 1);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    if (!chunk || chunk.length === 0) break;
    allStats.push(...chunk);
    if (chunk.length < CHUNK_SIZE) break;
    from += CHUNK_SIZE;
  }

  const raw = allStats.reduce<Record<string, number>>((acc, curr) => {
    const status = curr.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const rawPending = raw.pending || 0;
  const rawSent = raw.sent || 0;
  const rawDelivered = raw.delivered || 0;
  const rawRead = raw.read || 0;
  const rawFailed = raw.failed || 0;

  const summary = {
    ...raw,
    total: rawPending + rawSent + rawDelivered + rawRead + rawFailed,
    sent: rawSent + rawDelivered + rawRead,
    delivered: rawDelivered + rawRead,
    read: rawRead,
    failed: rawFailed,
    pending: rawPending,
    raw
  };

  return NextResponse.json(summary);
}
