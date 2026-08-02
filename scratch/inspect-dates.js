const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tid = 'd3e70732-00a0-4149-bb0e-bfafe8d3ca8f'; // Travelpedia
  const { data: tenant } = await db.from('tenants').select('*').eq('id', tid).single();
  console.log("Tenant Created At:", tenant.created_at);
  console.log("Tenant last_meta_payment_at:", tenant.last_meta_payment_at);

  const { data: templates } = await db.from('templates').select('*').eq('tenant_id', tid);
  console.log("Templates:");
  templates.forEach(t => console.log(`  Name: ${t.name} | Category: ${t.category} | Content: ${t.content}`));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let lastPaidDate = tenant?.last_meta_payment_at ? new Date(tenant.last_meta_payment_at) : null;
  if (!lastPaidDate && tenant?.created_at) {
    lastPaidDate = new Date(tenant.created_at);
  }
  const queryStartDate = lastPaidDate && lastPaidDate < startOfMonth
    ? lastPaidDate
    : startOfMonth;

  console.log("queryStartDate:", queryStartDate.toISOString());

  const { data: messages } = await db.from('messages').select('*').eq('tenant_id', tid).gte('created_at', queryStartDate.toISOString()).order('created_at', { ascending: true });
  console.log("Total messages found since start date:", messages.length);

  const categoryCost = {
    UTILITY: 0.1150,
    AUTHENTICATION: 0.1150,
    MARKETING: 0.8631
  };

  const compiledTemplates = templates.map((t) => {
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
  }).filter(Boolean);

  const categoryCache = new Map();

  const findTemplateCategory = (content) => {
    if (!content) return 'MARKETING';
    if (categoryCache.has(content)) {
      return categoryCache.get(content);
    }
    const matchByContent = templates.find((t) => t.content === content);
    if (matchByContent) {
      const cat = matchByContent.category || 'MARKETING';
      categoryCache.set(content, cat);
      return cat;
    }
    const tokenMatch = content.match(/\[Template:\s*([^\]]+)\]/);
    if (tokenMatch) {
      const tName = tokenMatch[1].trim();
      const matchByName = templates.find((t) => t.name === tName);
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

  const contactLastInbound = {};
  let totalCostSinceLastPaid = 0;
  let totalCostThisMonth = 0;

  messages.forEach((msg) => {
    const msgTime = new Date(msg.created_at).getTime();
    const contactId = msg.contact_id;
    if (!contactId) return; // skip messages without contact_id

    if (msg.direction === 'inbound') {
      contactLastInbound[contactId] = msgTime;
      console.log(`[INBOUND] Contact ${contactId} at ${msg.created_at}`);
    } else if (msg.direction === 'outbound') {
      const isTemplate = msg.message_type === 'template' || 
                         (msg.content && (msg.content.includes('[Template:') || templates.some((t) => t.content === msg.content)));

      if (isTemplate) {
        const lastInbound = contactLastInbound[contactId];
        const isWindowOpen = lastInbound && (msgTime - lastInbound <= 24 * 60 * 60 * 1000);

        if (!isWindowOpen) {
          const category = findTemplateCategory(msg.content);
          const cost = categoryCost[category.toUpperCase()] || 0.8631;
          if (msgTime >= startOfMonth.getTime()) {
            totalCostThisMonth += cost;
            console.log(`[CHARGE MONTH] ${category} cost ${cost} for contact ${contactId} at ${msg.created_at}`);
          }
          if (msgTime >= queryStartDate.getTime()) {
            totalCostSinceLastPaid += cost;
            console.log(`[CHARGE PAID] ${category} cost ${cost} for contact ${contactId} at ${msg.created_at}`);
          }
          contactLastInbound[contactId] = msgTime;
        } else {
          console.log(`[FREE (Window Open)] Outbound to ${contactId} at ${msg.created_at}`);
        }
      } else {
        console.log(`[FREE (Non-template)] Outbound to ${contactId} at ${msg.created_at}`);
      }
    }
  });

  console.log("Calculated totalCostThisMonth:", totalCostThisMonth);
  console.log("Calculated totalCostSinceLastPaid:", totalCostSinceLastPaid);
}

run();
