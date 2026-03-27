import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import cron from 'node-cron';
import { sendMetaTemplateMessage, sendMetaTextMessage } from './src/lib/whatsapp';
import { sendWhatsAppMessage, sendWhatsAppTextMessage } from './src/lib/gupshup';
import { db } from './src/lib/db';
import { decrypt } from './src/lib/encryption';
import { messageQueue } from './src/lib/queue';
import { checkLimit, incrementUsage } from './src/lib/limits';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const maskedUrl = redisUrl.replace(/:[^:@]+@/, ':****@'); // Mask password if present
console.log(`[Startup] Connecting to Redis: ${maskedUrl}`);

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  family: 0,
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
});

connection.on('connect', () => {
  console.log(`✅ [Redis] Connection established successfully to: ${maskedUrl}`);
  console.log(`[Redis] Using TLS: ${redisUrl.startsWith('rediss://') ? 'YES' : 'NO'}`);
});

connection.on('error', (err) => {
  console.error(`❌ [Redis] Connection error for ${maskedUrl}:`, err.message);
});

// --- CRASH PROTECTION ---
process.on('uncaughtException', (err) => {
  console.error('💥 [CRASH] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Check .env.local path.');
}

// ---------------------------------------------------------
// 1. Messaging Worker (Processes individual message jobs)
// ---------------------------------------------------------
const worker = new Worker('message-queue', async (job: Job) => {
  const { messageId, phone, isDirectText, textContent, components } = job.data;
  let { templateId, templateLanguage } = job.data;

  console.log(`[Worker] --- NEW JOB START: ${job.id} ---`);
  console.log(`[Worker] Job Data: msg=${messageId}, phone=${phone}, tpl=${templateId}, lang=${templateLanguage}`);

  // 1. Fetch message and its campaign/template context
  const { data: message, error: dbError } = await db
    .from('messages')
    .select('tenant_id, campaign_id')
    .eq('id', messageId)
    .maybeSingle();

  if (dbError) {
    console.error(`❌ [Worker] DB Error fetching message ${messageId}:`, dbError);
    throw new Error('Database error during message fetch');
  }

  if (!message) {
    console.warn(`⚠️ [Worker] Message ${messageId} not found in DB. Skipping job ${job.id}.`);
    return; // Complete job silently
  }

  // 2. Resolve Template Name/Language from DB (Ensures we skip stale numeric IDs in retried jobs)
  if (!isDirectText) {
    let resolvedTemplate = null;

    if (message.campaign_id) {
      console.log(`[Worker] Searching by campaign_id: ${message.campaign_id}`);
      const { data: campaign } = await db
        .from('campaigns')
        .select('templates(name, language, content)')
        .eq('id', message.campaign_id)
        .single();
      if (campaign?.templates) {
        resolvedTemplate = campaign.templates;
        console.log(`[Worker] Found template via campaign: ${(resolvedTemplate as any).name}`);
      }
    }

    // Fallback if campaign_id was missing (for older failed messages)
    if (!resolvedTemplate && templateId && !isNaN(Number(templateId))) {
      console.log(`[Worker] Searching fallback by numeric template_id: ${templateId} for tenant ${message.tenant_id}`);
      const { data: template } = await db
        .from('templates')
        .select('name, language, content')
        .eq('template_id', templateId)
        .eq('tenant_id', message.tenant_id)
        .maybeSingle();
      if (template) {
        resolvedTemplate = template;
        console.log(`[Worker] Found template via fallback ID lookup: ${template.name}`);
      } else {
        console.warn(`[Worker] Fallback lookup failed for ID ${templateId}. This explains the #132001 error if it persists.`);
      }
    }

    if (resolvedTemplate) {
      templateId = (resolvedTemplate as any).name;
      templateLanguage = (resolvedTemplate as any).language || 'en_US';
      const templateContent = (resolvedTemplate as any).content || '';

      console.log(`[Worker] FINAL RESOLUTION for job: Name=${templateId}, Lang=${templateLanguage}`);

      // Update message with resolved content for Inbox display
      if (templateContent) {
        await db.from('messages').update({ content: templateContent }).eq('id', messageId);
      }
    }
  }

  const { data: whatsappAccount } = await db.from('whatsapp_accounts')
    .select('*')
    .eq('tenant_id', message.tenant_id)
    .single();

  if (!whatsappAccount || (!whatsappAccount.access_token && !whatsappAccount.gupshup_api_key)) {
    await db.from('messages').update({ status: 'failed', error: 'Missing credentials' }).eq('id', messageId);
    throw new Error('Tenant missing credentials');
  }

  const provider = whatsappAccount.provider || 'META';

  let result;
  if (provider === 'META') {
    const decryptedToken = decrypt(whatsappAccount.access_token);
    const phoneNumberId = whatsappAccount.phone_number_id;
    const accessToken = decryptedToken;

    console.log(`[Worker] Sending message ${messageId} to ${phone} using template ${templateId}...`);

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    let payload: any;

    if (isDirectText) {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: textContent },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateId,
          language: { code: templateLanguage || 'en_US' },
          components: components || [],
        },
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error(`❌ [Worker] Meta API error for ${messageId}:`, responseData);
        throw new Error(`Meta API error: ${responseData.error?.message || response.statusText}`);
      }

      console.log(`✅ [Worker] Successfully sent ${messageId} to ${phone}. Provider ID: ${responseData.messages?.[0]?.id}`);
      result = { success: true, messageId: responseData.messages?.[0]?.id };

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`❌ [Worker] Error sending message ${messageId} to Meta API:`, error.message);
      result = { success: false, error: error.message };
    }

  } else if (provider === 'GUPSHUP') {
    const decryptedApiKey = decrypt(whatsappAccount.gupshup_api_key);
    const appName = whatsappAccount.gupshup_app_name;
    if (isDirectText) {
      result = await sendWhatsAppTextMessage(phone, textContent, appName, decryptedApiKey);
    } else {
      result = await sendWhatsAppMessage(phone, templateId, components || [], appName, decryptedApiKey);
    }
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  if (result.success) {
    await db.from('messages')
      .update({ status: 'sent', provider_message_id: result.messageId })
      .eq('id', messageId);
  } else {
    await db.from('messages')
      .update({ status: 'failed', error: String(result.error) })
      .eq('id', messageId);

    throw new Error(String(result.error));
  }
}, {
  connection: connection as any,
  lockDuration: 60000,      // Keep lock for 60s
  stalledInterval: 30000,   // Check for stalls every 30s
  maxStalledCount: 5        // Allow 5 stalls before permanent fail
});

// ---------------------------------------------------------
// 2. Campaign Scheduler (Advanced Automation)
// ---------------------------------------------------------
cron.schedule('* * * * *', async () => {
  const now = new Date().toISOString();
  console.log(`[Scheduler] Checking for campaigns due by ${now}...`);

  try {
    // a. Fetch draft campaigns whose scheduled time has arrived
    const { data: dueCampaigns, error } = await db
      .from('campaigns')
      .select('*, templates(*)')
      .eq('status', 'draft')
      .lte('scheduled_at', now);

    if (error) throw error;
    if (!dueCampaigns || dueCampaigns.length === 0) return;

    console.log(`[Scheduler] Found ${dueCampaigns.length} campaigns to trigger.`);

    for (const campaign of dueCampaigns) {
      const tenantId = campaign.tenant_id;

      // b. Verify Plan & Daily Limit
      const canSend = await checkLimit(tenantId, 'campaigns');
      if (!canSend) {
        console.warn(`[Scheduler] Skipping campaign ${campaign.id} - Daily limit reached for tenant ${tenantId}`);
        continue;
      }

      // c. Update status to 'running' to avoid double processing
      await db.from('campaigns').update({ status: 'running' }).eq('id', campaign.id);

      // d. Fetch contacts from group
      const { data: contacts } = await db
        .from('group_contacts')
        .select('contacts(*)')
        .eq('group_id', campaign.group_id);

      if (!contacts || contacts.length === 0) {
        await db.from('campaigns').update({ status: 'completed', error: 'No contacts found in group' }).eq('id', campaign.id);
        continue;
      }

      const validContacts = contacts.map(c => (c as any).contacts).filter(Boolean);
      console.log(`[Scheduler] Campaign ${campaign.id}: Queuing ${validContacts.length} messages.`);

      // e. Create messages and push to BullMQ
      const messagesToInsert = validContacts.map(c => ({
        tenant_id: tenantId,
        campaign_id: campaign.id, // CRITICAL FIX: Ensure campaign connection
        contact_id: c.id,
        phone_number: c.phone_number,
        status: 'pending',
        direction: 'outbound'
      }));

      const { data: insertedMsgs, error: mErr } = await db.from('messages').insert(messagesToInsert).select('id, phone_number');
      if (mErr || !insertedMsgs) {
        console.error(`❌ [Scheduler] Failed to create messages for campaign ${campaign.id}:`, mErr);
        continue;
      }

      const jobs = validContacts.map(c => {
        const msgRecord = insertedMsgs.find(im => im.phone_number === c.phone_number);
        let renderedContent = campaign.templates?.content || '';
        const params: any[] = [];

        // Basic variable resolution: {{name}}
        if (renderedContent.includes('{{name}}')) {
          const nameValue = c.name || 'Customer';
          renderedContent = renderedContent.replace(/{{name}}/g, nameValue);
          params.push({ type: 'text', text: nameValue });
        }

        return {
          name: 'send-whatsapp',
          data: {
            messageId: msgRecord?.id,
            phone: c.phone_number,
            templateId: campaign.templates?.name,
            templateLanguage: campaign.templates?.language || 'en_US',
            components: params.length > 0 ? [{ type: 'body', parameters: params }] : [],
            isDirectText: false
          }
        };
      });

      // Update messages with rendered content for Inbox display
      for (const contact of validContacts) {
        let content = campaign.templates?.content || '';
        if (content.includes('{{name}}')) {
          content = content.replace(/{{name}}/g, contact.name || 'Customer');
        }
        const msgRecord = insertedMsgs.find(im => im.phone_number === contact.phone_number);
        if (msgRecord) {
          await db.from('messages').update({ content }).eq('id', msgRecord.id);
        }
      }

      await messageQueue.addBulk(jobs);

      // f. Finalize campaign
      await db.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);
      await incrementUsage(tenantId, 'campaigns');

      console.log(`✅ [Scheduler] Campaign ${campaign.id} triggered successfully.`);
    }
  } catch (err) {
    console.error('❌ [Scheduler] Error in cron task:', err);
  }
});

// ---------------------------------------------------------
// 3. Startup Routines (Self-Healing & Backfill)
// ---------------------------------------------------------

/**
 * Resolves and saves content for old messages that show [Template Message]
 */
const backfillMissingContent = async () => {
  console.log('[Startup] Running content backfill for old messages...');
  try {
    const { data: messages, error: bError } = await db
      .from('messages')
      .select('id, tenant_id, campaign_id')
      .is('content', null)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(500);

    if (bError) throw bError;
    if (!messages || messages.length === 0) {
      console.log('[Startup] No messages found for backfill.');
      return;
    }

    console.log(`[Startup] Resolving content for ${messages.length} messages...`);
    let count = 0;
    for (const msg of messages) {
      if (msg.campaign_id) {
        const { data: campaign } = await db.from('campaigns').select('templates(content)').eq('id', msg.campaign_id).maybeSingle();
        if (campaign?.templates) {
          await db.from('messages').update({ content: (campaign.templates as any).content }).eq('id', msg.id);
          count++;
        } else {
          console.warn(`[Startup] Could not resolve template for campaign ${msg.campaign_id}`);
        }
      } else {
        console.warn(`[Startup] Message ${msg.id} missing campaign_id - cannot resolve content.`);
      }
    }
    console.log(`✅ [Startup] Backfilled content for ${count}/${messages.length} messages.`);
  } catch (err) {
    console.error('❌ [Startup] Backfill failed:', err);
  }
};

const requeuePendingMessages = async () => {
  try {
    console.log('[Startup] Checking for stuck "pending" messages...');
    const { data: messages, error } = await db
      .from('messages')
      .select('*, campaigns(templates(name, content))')
      .eq('status', 'pending')
      .limit(100);

    if (error) throw error;
    if (!messages || messages.length === 0) {
      console.log('✅ [Startup] No stuck messages found.');
      return;
    }

    console.log(`[Startup] Re-queuing ${messages.length} pending messages...`);
    const jobs = messages.map(msg => ({
      name: 'send-whatsapp',
      data: {
        messageId: msg.id,
        phone: msg.phone_number,
        templateId: (msg.campaigns?.templates as any)?.name,
        templateLanguage: 'en_US', // Default to en_US for now to avoid DB discrepancy
        params: [],
        isDirectText: !msg.campaign_id,
        textContent: msg.content
      }
    }));

    await messageQueue.addBulk(jobs);
    console.log(`✅ [Startup] Successfully re-queued ${messages.length} messages.`);
  } catch (err) {
    console.error('❌ [Startup] Pending repair failed:', err);
  }
};

const retryFailedJobs = async () => {
  try {
    const failedJobs = await messageQueue.getFailed();
    if (failedJobs.length > 0) {
      console.log(`[Startup] Found ${failedJobs.length} failed jobs. Retrying...`);
      await Promise.all(failedJobs.map(job => job.retry()));
      console.log(`✅ [Startup] Triggered retry for ${failedJobs.length} jobs.`);
    }
  } catch (err) {
    console.error('❌ [Startup] Failed to retry jobs:', err);
  }
};

// Start all routines
(async () => {
  await backfillMissingContent();
  await requeuePendingMessages();
  await retryFailedJobs();
})();

console.log('🚀 PingStack Engine (Worker + Scheduler) is live.');
console.log(`[Config] Redis: ${redisUrl.split('@')[1] || redisUrl}`);

