import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { connection } from '@/lib/queue';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    // Check Redis Cache first (90 seconds TTL)
    if (connection && connection.status === 'ready') {
      try {
        const cacheKey = `stats:${tenantId}`;
        const cached = await connection.get(cacheKey);
        if (cached) {
          return NextResponse.json(JSON.parse(cached), {
            headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=45' }
          });
        }
      } catch (cacheErr) {
        console.error('[Stats Cache] Failed to read from Redis:', cacheErr);
      }
    }

    // ── Phase 1: Run all independent queries in parallel ──────────────
    const [
      tenantRes,
      templatesRes,
      contactsRes,
      sentRes,
      deliveredRes,
      readRes,
      failedRes,
      inboundRes
    ] = await Promise.all([
      // Tenant billing info
      db.from('tenants')
        .select('last_meta_payment_at, meta_budget_limit, created_at')
        .eq('id', tenantId)
        .single()
        .then(async (res) => {
          if (res.error) {
            const fallback = await db!.from('tenants')
              .select('created_at')
              .eq('id', tenantId)
              .single();
            return { data: fallback.data || { created_at: new Date().toISOString() }, error: null };
          }
          return res;
        }),

      // Templates — need category, status, name, and content for cost matching
      db.from('templates')
        .select('status, name, category, content')
        .eq('tenant_id', tenantId),

      // Contact count (head-only)
      db.from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Message status counts (all parallel, head-only — no rows loaded)
      db.from('messages').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).in('status', ['sent', 'delivered', 'read']),
      db.from('messages').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).in('status', ['delivered', 'read']),
      db.from('messages').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('status', 'read'),
      db.from('messages').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('status', 'failed'),
      db.from('messages').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('direction', 'inbound'),
    ]);

    const tenant = tenantRes.data as any;
    const templates = templatesRes.data || [];
    const totalContacts = contactsRes.count || 0;
    const approvedTemplates = templates.filter((t: any) => t.status === 'APPROVED').length;

    // ── Phase 2: Determine date range for cost estimation ─────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let lastPaidDate = tenant?.last_meta_payment_at ? new Date(tenant.last_meta_payment_at) : null;
    if (!lastPaidDate && tenant?.created_at) {
      lastPaidDate = new Date(tenant.created_at);
    }
    const queryStartDate = lastPaidDate && lastPaidDate < startOfMonth
      ? lastPaidDate
      : startOfMonth;

    // ── Phase 3: Fetch billing transactions for cost & conversation metrics ─
    const [txMonthRes, txPaidRes, conversationsRes] = await Promise.all([
      db.from('billing_transactions')
        .select('cost')
        .eq('tenant_id', tenantId)
        .gte('incurred_at', startOfMonth.toISOString()),

      db.from('billing_transactions')
        .select('cost')
        .eq('tenant_id', tenantId)
        .gte('incurred_at', queryStartDate.toISOString()),

      db.from('billing_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('incurred_at', queryStartDate.toISOString())
    ]);

    const estimatedCostThisMonth = (txMonthRes.data || []).reduce((acc: number, t: any) => acc + Number(t.cost || 0), 0);
    const estimatedCostSinceLastPayment = (txPaidRes.data || []).reduce((acc: number, t: any) => acc + Number(t.cost || 0), 0);
    const conversations = conversationsRes.count || 0;

    const stats = {
      totalContacts,
      conversations,
      templatesApproved: approvedTemplates,
      inboundMessages: inboundRes.count || 0,
      sent: sentRes.count || 0,
      delivered: deliveredRes.count || 0,
      read: readRes.count || 0,
      failed: failedRes.count || 0,
      estimatedCostThisMonth,
      estimatedCostSinceLastPayment,
      lastMetaPaymentAt: tenant?.last_meta_payment_at || null,
      metaBudgetLimit: tenant?.meta_budget_limit || 1000,
    };

    // Cache computed stats in Redis for 90 seconds
    if (connection && connection.status === 'ready') {
      try {
        const cacheKey = `stats:${tenantId}`;
        await connection.set(cacheKey, JSON.stringify(stats), 'EX', 90);
      } catch (cacheErr) {
        console.error('[Stats Cache] Failed to write to Redis:', cacheErr);
      }
    }

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=45' }
    });
  } catch (err: any) {
    console.error('Stats Error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
