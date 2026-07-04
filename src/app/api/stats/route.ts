import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    // 1. Get Tenant details for payment info
    const { data: tenant } = await db
      .from('tenants')
      .select('last_meta_payment_at, meta_budget_limit, created_at')
      .eq('id', tenantId)
      .single();

    // 2. Count Templates by Status
    const { data: templates } = await db
      .from('templates')
      .select('status, name, content, category')
      .eq('tenant_id', tenantId);

    const approvedTemplates = templates?.filter((t: any) => t.status === 'APPROVED').length || 0;
    const templatesList = templates || [];

    // 3. Count Total Contacts
    const { count: totalContacts } = await db
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // 4. Determine dates for cost estimation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let lastPaidDate = tenant?.last_meta_payment_at ? new Date(tenant.last_meta_payment_at) : null;
    if (!lastPaidDate && tenant?.created_at) {
      lastPaidDate = new Date(tenant.created_at);
    }

    const queryStartDate = lastPaidDate && lastPaidDate < startOfMonth 
      ? lastPaidDate 
      : startOfMonth;

    // 5. Query Messages since queryStartDate
    const { data: messages } = await db
      .from('messages')
      .select('status, contact_id, direction, created_at, content, message_type')
      .eq('tenant_id', tenantId)
      .gte('created_at', queryStartDate.toISOString())
      .order('created_at', { ascending: true });

    // 6. Cost Estimation Calculation
    const categoryCost: Record<string, number> = {
      UTILITY: 0.1150,
      AUTHENTICATION: 0.1150,
      MARKETING: 0.8631
    };

    // Pre-compile regexes for templates
    const compiledTemplates = templatesList.map(t => {
      if (!t.content) return null;
      try {
        const escaped = t.content.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regexStr = '^' + escaped.replace(/\\\{\\\{\d+\\\}\\\}/g, '.*') + '$';
        return {
          category: t.category || 'MARKETING',
          regex: new RegExp(regexStr)
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean) as { category: string; regex: RegExp }[];

    // Cache content strings categories
    const categoryCache = new Map<string, string>();

    const findTemplateCategory = (content: string | null) => {
      if (!content) return 'MARKETING';
      
      // Check cache first
      if (categoryCache.has(content)) {
        return categoryCache.get(content)!;
      }

      // Check simple matches
      const matchByContent = templatesList.find(t => t.content === content);
      if (matchByContent) {
        const cat = matchByContent.category || 'MARKETING';
        categoryCache.set(content, cat);
        return cat;
      }

      const tokenMatch = content.match(/\[Template:\s*([^\]]+)\]/);
      if (tokenMatch) {
        const tName = tokenMatch[1].trim();
        const matchByName = templatesList.find(t => t.name === tName);
        if (matchByName) {
          const cat = matchByName.category || 'MARKETING';
          categoryCache.set(content, cat);
          return cat;
        }
      }

      // Check pre-compiled regexes
      for (const ct of compiledTemplates) {
        if (ct.regex.test(content)) {
          categoryCache.set(content, ct.category);
          return ct.category;
        }
      }

      categoryCache.set(content, 'MARKETING');
      return 'MARKETING';
    };

    const calculateCost = (msgList: any[], startDate: Date) => {
      const contactLastInbound: Record<string, number> = {};
      let total = 0;

      for (const msg of msgList) {
        const msgTime = new Date(msg.created_at).getTime();
        const contactId = msg.contact_id;

        if (msg.direction === 'inbound') {
          contactLastInbound[contactId] = msgTime;
        } else if (msg.direction === 'outbound') {
          const isTemplate = msg.message_type === 'template' || 
                             (msg.content && (msg.content.includes('[Template:') || templatesList.some(t => t.content === msg.content)));

          if (isTemplate) {
            const lastInbound = contactLastInbound[contactId];
            const isWindowOpen = lastInbound && (msgTime - lastInbound <= 24 * 60 * 60 * 1000);

            if (!isWindowOpen) {
              const category = findTemplateCategory(msg.content);
              const cost = categoryCost[category.toUpperCase()] || 0.8631;
              
              if (msgTime >= startDate.getTime()) {
                total += cost;
              }
              contactLastInbound[contactId] = msgTime;
            }
          }
        }
      }
      return total;
    };

    const estimatedCostThisMonth = calculateCost(messages || [], startOfMonth);
    const estimatedCostSinceLastPayment = calculateCost(messages || [], lastPaidDate || new Date(0));

    // 7. Get total (all time) message counts in parallel
    const [
      sentRes,
      deliveredRes,
      readRes,
      failedRes,
      inboundRes
    ] = await Promise.all([
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['sent', 'delivered', 'read']),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['delivered', 'read']),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'read'),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'failed'),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('direction', 'inbound')
    ]);

    const totalSent = sentRes.count;
    const totalDelivered = deliveredRes.count;
    const totalRead = readRes.count;
    const totalFailed = failedRes.count;
    const totalInbound = inboundRes.count;

    const stats = {
      totalContacts: totalContacts || 0,
      conversations: Array.from(new Set((messages || []).map((m: any) => m.contact_id))).length || 0,
      templatesApproved: approvedTemplates,
      inboundMessages: totalInbound || 0,
      sent: totalSent || 0,
      delivered: totalDelivered || 0,
      read: totalRead || 0,
      failed: totalFailed || 0,
      estimatedCostThisMonth,
      estimatedCostSinceLastPayment,
      lastMetaPaymentAt: tenant?.last_meta_payment_at || null,
      metaBudgetLimit: tenant?.meta_budget_limit || 1000,
    };

    return NextResponse.json(stats);
  } catch (err: any) {
    console.error('Stats Error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
