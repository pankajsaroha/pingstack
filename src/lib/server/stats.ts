import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';

export async function getStatsServer(tenantId: string) {
  if (!tenantId) return null;
  if (!db) return null;

  try {
    // Check Redis Cache first (90 seconds TTL)
    if (connection && connection.status === 'ready') {
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

      // Contact count (head-only, no rows loaded)
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

    // ── Phase 3: Fetch only minimal message columns for cost+conv calc ─
    const { data: messages, error: mErr } = await db
      .from('messages')
      .select('contact_id, direction, message_type, content, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', queryStartDate.toISOString())
      .order('created_at', { ascending: true });

    if (mErr) {
      console.error('[Stats Server] messages query failed:', mErr);
    }

    // ── Phase 4: Cost Estimation ──────────────────────────────────────
    const categoryCost: Record<string, number> = {
      UTILITY: 0.1150,
      AUTHENTICATION: 0.1150,
      MARKETING: 0.8631
    };

    // Pre-compile regexes for templates
    const compiledTemplates = templates.map((t: any) => {
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

    const findTemplateCategory = (content: string | null): string => {
      if (!content) return 'MARKETING';
      if (categoryCache.has(content)) {
        return categoryCache.get(content)!;
      }

      // Check simple matches
      const matchByContent = templates.find((t: any) => t.content === content);
      if (matchByContent) {
        const cat = matchByContent.category || 'MARKETING';
        categoryCache.set(content, cat);
        return cat;
      }

      const tokenMatch = content.match(/\[Template:\s*([^\]]+)\]/);
      if (tokenMatch) {
        const tName = tokenMatch[1].trim();
        const matchByName = templates.find((t: any) => t.name === tName);
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
                             (msg.content && (msg.content.includes('[Template:') || templates.some((t: any) => t.content === msg.content)));

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

    const stats = {
      totalContacts,
      conversations: new Set((messages || []).map((m: any) => m.contact_id).filter(Boolean)).size,
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
        console.error('[Stats Cache Server] Failed to write to Redis:', cacheErr);
      }
    }

    return stats;
  } catch (err) {
    console.error('[getStatsServer] unexpected error:', err);
    return null;
  }
}
