import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';

export async function getStatsServer(tenantId: string) {
  if (!tenantId) return null;
  if (!db) return null;

  try {
    // Check Redis Cache first (30 seconds TTL)
    if (connection) {
      try {
        const cacheKey = `stats:${tenantId}`;
        const cached = await connection.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheErr) {
        console.error('[Stats Cache Server] Failed to read from Redis:', cacheErr);
      }
    }

    // 1. Get Tenant details
    const { data: tenant } = await db
      .from('tenants')
      .select('last_meta_payment_at, meta_budget_limit, created_at')
      .eq('id', tenantId)
      .single();

    // 2. Count Templates
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

    // 4. Determine dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let lastPaidDate = tenant?.last_meta_payment_at ? new Date(tenant.last_meta_payment_at) : null;
    if (!lastPaidDate && tenant?.created_at) {
      lastPaidDate = new Date(tenant.created_at);
    }

    const queryStartDate = lastPaidDate && lastPaidDate < startOfMonth
      ? lastPaidDate
      : startOfMonth;

    // 5. Query Messages
    const { data: messages } = await db
      .from('messages')
      .select('status, contact_id, direction, created_at, content, message_type')
      .eq('tenant_id', tenantId)
      .gte('created_at', queryStartDate.toISOString())
      .order('created_at', { ascending: true });

    // 6. Cost calculations
    const categoryCost: Record<string, number> = {
      UTILITY: 0.1150,
      AUTHENTICATION: 0.1150,
      MARKETING: 0.8631
    };

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

    const categoryCache = new Map<string, string>();

    const findTemplateCategory = (content: string | null) => {
      if (!content) return 'MARKETING';
      if (categoryCache.has(content)) {
        return categoryCache.get(content)!;
      }

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

    // 7. Parallel message count calls
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

    const stats = {
      totalContacts: totalContacts || 0,
      conversations: Array.from(new Set((messages || []).map((m: any) => m.contact_id))).length || 0,
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

    // Cache computed stats in Redis for 30 seconds
    if (connection) {
      try {
        const cacheKey = `stats:${tenantId}`;
        await connection.set(cacheKey, JSON.stringify(stats), 'EX', 30);
      } catch (cacheErr) {
        console.error('[Stats Cache Server] Failed to write to Redis:', cacheErr);
      }
    }

    return stats;
  } catch (err) {
    console.error('[getStatsServer] unexpected error:', err);
    return null;
  }
}
