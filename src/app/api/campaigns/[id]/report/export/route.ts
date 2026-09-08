import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';

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

    // 1. Authorize Plan Feature (Growth / Pro only)
    const allowed = await isFeatureAllowed(tenantId, 'csv_export');
    if (!allowed) {
      return NextResponse.json({
        error: 'CSV Export is a Growth feature. Please upgrade to Growth to export campaign reports.',
        code: 'FEATURE_GATED'
      }, { status: 403 });
    }

    // 2. Fetch Campaign details
    const { data: campaign, error: cErr } = await db
      .from('campaigns')
      .select('id, name, created_at')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (cErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // 3. Fetch all messages for this campaign (chunked fetch if large)
    let allMessages: any[] = [];
    let from = 0;
    const CHUNK_SIZE = 1000;
    while (true) {
      const { data: chunk, error: mErr } = await db
        .from('messages')
        .select(`
          id,
          phone_number,
          status,
          created_at,
          error,
          variables,
          contacts (
            name
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(from, from + CHUNK_SIZE - 1);

      if (mErr) throw mErr;
      if (!chunk || chunk.length === 0) break;
      allMessages.push(...chunk);
      if (chunk.length < CHUNK_SIZE) break;
      from += CHUNK_SIZE;
    }

    // 4. Construct CSV rows
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const maxVars = allMessages.reduce((max, m) => {
      const vLen = Array.isArray(m.variables) ? m.variables.length : 0;
      return Math.max(max, vLen);
    }, 0);

    const headers = [
      'Recipient Name',
      'Phone Number',
      'Status',
      'Timestamp',
      'Failure Reason',
      ...Array.from({ length: maxVars }, (_, i) => `Var ${i + 1}`)
    ];

    const csvLines = [headers.map(escapeCsv).join(',')];

    for (const msg of allMessages) {
      const contactName = (msg.contacts as any)?.name || 'Customer';
      const phone = msg.phone_number || '';
      const status = msg.status || 'unknown';
      const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleString() : '';
      const failureReason = msg.error || '';
      const vars = Array.isArray(msg.variables) ? msg.variables : [];

      const row = [
        contactName,
        phone,
        status,
        timestamp,
        failureReason,
        ...Array.from({ length: maxVars }, (_, i) => vars[i] !== undefined ? String(vars[i]) : '')
      ];

      csvLines.push(row.map(escapeCsv).join(','));
    }

    const csvContent = csvLines.join('\r\n');
    const safeName = (campaign.name || 'campaign').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${safeName}_report_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (err: unknown) {
    console.error('Campaign CSV export error:', err);
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
