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
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
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

  console.log(`[Worker] Processing message ${messageId} for ${phone}...`);
  
  // 1. Fetch message and its campaign/template context
  const { data: message, error: dbError } = await db
    .from('messages')
    .select('tenant_id, campaign_id')
    .eq('id', messageId)
    .single();

  if (dbError || !message) {
    console.error(`❌ [Worker] DB Error fetching message ${messageId}:`, dbError);
    throw new Error('Message not found or RLS denial');
  }

  // 2. Resolve Template Name/Language from DB (Ensures we skip stale numeric IDs in retried jobs)
  if (!isDirectText && message.campaign_id) {
    const { data: campaign } = await db
      .from('campaigns')
      .select('templates(name, language)')
      .eq('id', message.campaign_id)
      .single();
    
    if (campaign?.templates) {
      templateId = (campaign.templates as any).name;
      templateLanguage = (campaign.templates as any).language || 'en_US';
      console.log(`[Worker] Resolved template for job: ${templateId} (${templateLanguage})`);
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
    if (isDirectText) {
      result = await sendMetaTextMessage(phoneNumberId, decryptedToken, phone, textContent);
    } else {
      result = await sendMetaTemplateMessage(phoneNumberId, decryptedToken, phone, templateId, templateLanguage || 'en_US', components || []);
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
}, { connection: connection as any });

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
        contact_id: c.id,
        phone_number: c.phone_number,
        status: 'pending'
      }));

      const { data: insertedMsgs, error: mErr } = await db.from('messages').insert(messagesToInsert).select('id, phone_number');
      if (mErr || !insertedMsgs) {
        console.error(`❌ [Scheduler] Failed to create messages for campaign ${campaign.id}:`, mErr);
        continue;
      }

      const jobs = insertedMsgs.map(m => ({
        name: 'send-whatsapp',
        data: {
          messageId: m.id,
          phone: m.phone_number,
          templateId: campaign.templates?.name, // Use 'name' for Meta Cloud API
          templateLanguage: campaign.templates?.language || 'en_US',
          params: [],
          isDirectText: false
        }
      }));

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

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ [Worker] Job ${job?.id} failed: ${err.message}`);
});

// ---------------------------------------------------------
// 3. Startup Repair (Optional: Retry failed jobs on deploy)
// ---------------------------------------------------------
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

retryFailedJobs();

console.log('🚀 PingStack Engine (Worker + Scheduler) is live.');
console.log(`[Config] Redis: ${redisUrl.split('@')[1] || redisUrl}`);

