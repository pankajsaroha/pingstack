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
    if (connection) {
      try {
        const cacheKey = `stats:${tenantId}`;
        const cached = await connection.get(cacheKey);
        if (cached) {
          return NextResponse.json(JSON.parse(cached));
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
        .single(),

      // Templates — only need category, status, name for cost matching
      db.from('templates')
        .select('status, name, category')
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

    const tenant = tenantRes.data;
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

    // ── Phase 3: Fetch only minimal message columns for cost+conv calc ─
    // Omit `content` — we use message_type='template' flag + template name token
    // instead of regex-matching raw content strings to determine category.
    const { data: messages } = await db
      .from('messages')
      .select('contact_id, direction, message_type, template_name, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', queryStartDate.toISOString())
      .order('created_at', { ascending: true });

    // ── Phase 4: Cost Estimation ──────────────────────────────────────
    const categoryCost: Record<string, number> = {
      UTILITY: 0.1150,
      AUTHENTICATION: 0.1150,
      MARKETING: 0.8631
    };

    // Build a fast name→category lookup map instead of per-message linear scans
    const templateCategoryMap = new Map<string, string>(
      templates.map((t: any) => [t.name?.toLowerCase(), t.category || 'MARKETING'])
    );

    const findTemplateCategory = (templateName: string | null | undefined): string => {
      if (!templateName) return 'MARKETING';
      return templateCategoryMap.get(templateName.toLowerCase()) || 'MARKETING';
    };

    const calculateCost = (msgList: any[], startDate: Date) => {
      const contactLastInbound: Record<string, number> = {};
      let total = 0;

      for (const msg of msgList) {
        const msgTime = new Date(msg.created_at).getTime();
        const contactId = msg.contact_id;

        if (msg.direction === 'inbound') {
          contactLastInbound[contactId] = msgTime;
        } else if (msg.direction === 'outbound' && msg.message_type === 'template') {
          const lastInbound = contactLastInbound[contactId];
          const isWindowOpen = lastInbound && (msgTime - lastInbound <= 24 * 60 * 60 * 1000);

          if (!isWindowOpen) {
            const category = findTemplateCategory(msg.template_name);
            const cost = categoryCost[category.toUpperCase()] || 0.8631;
            if (msgTime >= startDate.getTime()) {
              total += cost;
            }
            contactLastInbound[contactId] = msgTime;
          }
        }
      }
      return total;
    };

    const estimatedCostThisMonth = calculateCost(messages || [], startOfMonth);
    const estimatedCostSinceLastPayment = calculateCost(messages || [], lastPaidDate || new Date(0));

    const stats = {
      totalContacts,
      conversations: new Set((messages || []).map((m: any) => m.contact_id)).size,
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
    if (connection) {
      try {
        const cacheKey = `stats:${tenantId}`;
        await connection.set(cacheKey, JSON.stringify(stats), 'EX', 90);
      } catch (cacheErr) {
        console.error('[Stats Cache] Failed to write to Redis:', cacheErr);
      }
    }

    return NextResponse.json(stats);
  } catch (err: any) {
    console.error('Stats Error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
