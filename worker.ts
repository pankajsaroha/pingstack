import './src/lib/load-env';

console.log(`
#########################################
#                                       #
#   🚀 PINGSTACK WORKER v2.1 ACTIVE     #
#      (DATABASE-FIRST RELIABILITY)      #
#                                       #
#########################################
`);

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import cron from 'node-cron';
import { sendMetaTemplateMessage, sendMetaTextMessage } from './src/lib/whatsapp';
import { sendWhatsAppMessage, sendWhatsAppTextMessage } from './src/lib/gupshup';
import { dbAdmin as _dbAdmin } from './src/lib/db';
if (!_dbAdmin) throw new Error('Database client (dbAdmin) is not initialized');
const db = _dbAdmin;
import { decrypt } from './src/lib/encryption';
import { messageQueue } from './src/lib/queue';
import { checkLimit, incrementUsage } from './src/lib/limits';

// Helper to record billing transactions for outbound templates
async function recordBillingIfNecessary(
  tenantId: string,
  contactId: string | null,
  messageType: string | null,
  content: string | null,
  createdAt: string
) {
  if (!contactId) return;

  try {
    // 1. Fetch last inbound message timestamp for this contact
    const { data: lastInbound } = await db
      .from('messages')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fetch last billing transaction for this contact
    const { data: lastTx } = await db
      .from('billing_transactions')
      .select('incurred_at')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .order('incurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const msgTime = new Date(createdAt).getTime();
    const lastInboundTime = lastInbound ? new Date(lastInbound.created_at).getTime() : 0;
    const lastTxTime = lastTx ? new Date(lastTx.incurred_at).getTime() : 0;

    const isUserWindowOpen = lastInboundTime > 0 && (msgTime - lastInboundTime <= 24 * 60 * 60 * 1000);
    const isBizWindowOpen = lastTxTime > 0 && (msgTime - lastTxTime <= 24 * 60 * 60 * 1000);

    if (!isUserWindowOpen && !isBizWindowOpen) {
      // Start a new chargeable business-initiated conversation!
      // Resolve templates for tenant to determine category/cost
      const { data: templates } = await db
        .from('templates')
        .select('name, category, content')
        .eq('tenant_id', tenantId);

      const categoryCost: Record<string, number> = {
        UTILITY: 0.1150,
        AUTHENTICATION: 0.1150,
        MARKETING: 0.8631
      };

      let category = 'MARKETING';
      if (templates && templates.length > 0 && content) {
        const matchByContent = templates.find((t: any) => t.content === content);
        if (matchByContent) {
          category = matchByContent.category || 'MARKETING';
        } else {
          const tokenMatch = content.match(/\[Template:\s*([^\]]+)\]/);
          if (tokenMatch) {
            const tName = tokenMatch[1].trim();
            const matchByName = templates.find((t: any) => t.name === tName);
            if (matchByName) {
              category = matchByName.category || 'MARKETING';
            }
          } else {
            // Regex match
            for (const t of templates) {
              if (t.content) {
                try {
                  const escaped = t.content.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                  const regexStr = '^' + escaped.replace(/\\\{\\\{\d+\\\}\\\}/g, '.*') + '$';
                  const regex = new RegExp(regexStr);
                  if (regex.test(content)) {
                    category = t.category || 'MARKETING';
                    break;
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      const cost = categoryCost[category.toUpperCase()] || 0.8631;

      // Log transaction
      const { error: txErr } = await db.from('billing_transactions').insert({
        tenant_id: tenantId,
        contact_id: contactId,
        category,
        cost,
        incurred_at: createdAt
      });

      if (txErr) {
        console.error('[Billing] Failed to insert business-initiated transaction:', txErr);
      } else {
        console.log(`[Billing] Logged business-initiated conversation (cost: ${cost}): contact=${contactId}`);
      }
    } else if (isUserWindowOpen && !isBizWindowOpen) {
      // User window is open, but no billing transaction has recorded this session yet.
      // Log this as a free USER_INITIATED transaction.
      const { error: txErr } = await db.from('billing_transactions').insert({
        tenant_id: tenantId,
        contact_id: contactId,
        category: 'USER_INITIATED',
        cost: 0.0000,
        incurred_at: createdAt
      });

      if (txErr) {
        console.error('[Billing] Failed to insert user-initiated transaction:', txErr);
      } else {
        console.log(`[Billing] Logged free user-initiated conversation: contact=${contactId}`);
      }
    }
  } catch (err: any) {
    console.error('[Billing] Error checking/logging transaction:', err.message || err);
  }
}

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
  const { messageId, phone, components, params } = job.data;
  let { templateId, templateLanguage } = job.data;

  // 0. Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    console.warn(`⚠️ [Worker] Invalid UUID format for messageId: ${messageId}. Skipping job ${job.id}.`);
    return;
  }

  console.log(`[Worker] --- NEW JOB START: ${job.id} ---`);
  console.log(`[Worker] Job Data: msg=${messageId}, phone=${phone}, tpl=${templateId}, lang=${templateLanguage}`);

  // 1. Fetch message and its context
  const { data: message, error: dbError } = await db
    .from('messages')
    .select('*, campaigns(templates(name, language, content))')
    .eq('id', messageId)
    .maybeSingle();

  if (dbError) {
    console.error(`❌ [Worker] DB Error fetching message ${messageId} for job ${job.id}:`, {
      error: dbError,
      jobData: job.data
    });
    throw new Error('Database error during message fetch');
  }

  if (!message) {
    console.warn(`⚠️ [Worker] Message ${messageId} not found in DB. Skipping job ${job.id}.`);
    return;
  }

  // --- SOURCE OF TRUTH OVERRIDE ---
  console.log(`[Worker] DB Message Fetched: ID=${messageId}`, { 
    type: message.message_type, 
    hasPath: !!message.media_path,
    campId: message.campaign_id 
  });

  const dbType = message.message_type;
  const hasMediaPath = !!message.media_path;
  const isMedia = ['image', 'video', 'audio', 'document'].includes(dbType) || hasMediaPath;
  const mediaType = isMedia ? (['image', 'video', 'audio', 'document'].includes(dbType) ? dbType : 'document') : null;
  const mediaPath = message.media_path;
  const isDirectText = !templateId && !message.campaign_id && (!isMedia && (dbType === 'text' || !dbType));
  const textContent = message.content;
  const caption = message.content;
  const fileName = message.content || (mediaPath ? mediaPath.split('/').pop() : 'file');

  let resolvedTemplateId = templateId;
  let resolvedTemplateLanguage = templateLanguage;

  if (!isDirectText && !isMedia) {
    // 2. Resolve Template Name/Language
    if (message.campaign_id) {
       const tpl = (message.campaigns as any)?.templates;
       if (tpl) {
         resolvedTemplateId = tpl.name;
         resolvedTemplateLanguage = tpl.language || 'en_US';
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

    const msgTypeDesc = isMedia ? `media:${mediaType}` : (isDirectText ? 'text' : `template:${resolvedTemplateId}`);
    console.log(`[Worker] Sending message ${messageId} to ${phone} type=${msgTypeDesc}...`);

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    let payload: any;

    const finalComponents = components || (params && params.length > 0 ? [{ type: 'body', parameters: params }] : []);

    if (isMedia && mediaPath && mediaType) {
      // 1. Generate Signed URL for Meta to fetch (1 hour expiry)
      const { data, error: sError } = await db.storage
        .from('chat-media')
        .createSignedUrl(mediaPath, 3600);

      if (sError || !data?.signedUrl) {
        throw new Error(`Failed to generate signed URL: ${sError?.message || 'Unknown error'}`);
      }

      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: mediaType,
        [mediaType]: { 
          link: data.signedUrl,
          ...(caption ? { caption } : {}),
          ...(mediaType === 'document' ? { filename: fileName || mediaPath.split('/').pop() } : {})
        },
      };
    } else if (isDirectText) {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: textContent || '' },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: resolvedTemplateId || '',
          language: { code: resolvedTemplateLanguage || 'en_US' },
          components: finalComponents,
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

    // Record billing transaction for outbound template messages
    if (!isDirectText && !isMedia) {
      try {
        await recordBillingIfNecessary(
          message.tenant_id,
          message.contact_id,
          dbType,
          message.content,
          message.created_at
        );
      } catch (bErr: any) {
        console.error('[Worker] Billing hook failed:', bErr.message || bErr);
      }
    }
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

      const validContacts = contacts.map((c: any) => c.contacts).filter(Boolean);
      console.log(`[Scheduler] Campaign ${campaign.id}: Queuing ${validContacts.length} messages.`);

      // e. Create messages and push to BullMQ
      const messagesToInsert = validContacts.map((c: any) => ({
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

      const jobs = validContacts.map((c: any) => {
        const msgRecord = insertedMsgs.find((im: any) => im.phone_number === c.phone_number);
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
      for (const contact of validContacts as any[]) {
        let content = campaign.templates?.content || '';
        if (content.includes('{{name}}')) {
          content = content.replace(/{{name}}/g, contact.name || 'Customer');
        }
        const msgRecord = insertedMsgs.find((im: any) => im.phone_number === contact.phone_number);
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
// 2.5. Campaign Processing Worker (Processes bulk campaign pipelines)
// ---------------------------------------------------------
const campaignWorker = new Worker('campaign-queue', async (job: Job) => {
  const { tenantId, campaignId, groupIds, contactIds, directData } = job.data;
  console.log(`[Campaign Worker] Processing campaign ${campaignId} for tenant ${tenantId}...`);

  // 1. Get Campaign and Template
  const { data: campaign, error: cErr } = await db.from('campaigns')
    .select('*, templates(name, language, content)')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single();

  if (cErr || !campaign) {
    console.error(`[Campaign Worker] Campaign ${campaignId} not found in DB:`, cErr);
    return;
  }

  let messagesToInsert: any[] = [];

  if (directData && Array.isArray(directData)) {
    // A. Direct Excel/CSV Data mode
    messagesToInsert = directData.map((row: any) => ({
      tenant_id: tenantId,
      campaign_id: campaignId,
      phone_number: String(row.phone || '').replace(/\D/g, ''),
      variables: row.variables || [],
      status: 'pending',
      direction: 'outbound',
      content: (campaign.templates as any).content || '[Template Message]',
      message_type: 'template'
    }));
  } else {
    // B. Group/Contact mode
    let targetContactIds = new Set<string>(contactIds || []);
    if (groupIds && groupIds.length > 0) {
      const { data: gcData } = await db.from('group_contacts').select('contact_id').in('group_id', groupIds).eq('tenant_id', tenantId);
      gcData?.forEach((gc: any) => targetContactIds.add(gc.contact_id));
    }

    const uniqueContactIds = Array.from(targetContactIds);
    if (uniqueContactIds.length > 0) {
      const { data: contacts } = await db.from('contacts').select('*').in('id', uniqueContactIds).eq('tenant_id', tenantId);
      
      messagesToInsert = (contacts || []).map((c: any) => ({
        tenant_id: tenantId,
        campaign_id: campaignId,
        contact_id: c.id,
        phone_number: c.phone_number,
        variables: [],
        status: 'pending',
        direction: 'outbound',
        content: (campaign.templates as any).content || '[Template Message]',
        message_type: 'template'
      }));
    }
  }

  if (messagesToInsert.length === 0) {
    console.warn(`[Campaign Worker] Campaign ${campaignId} has no target contacts.`);
    await db.from('campaigns').update({ status: 'completed', error: 'No contacts selected' }).eq('id', campaignId);
    return;
  }

  console.log(`[Campaign Worker] Batch inserting ${messagesToInsert.length} messages into database...`);

  // Insert in batches to avoid Supabase query payload limits
  const batchSize = 1000;
  const insertedMsgs: any[] = [];

  for (let i = 0; i < messagesToInsert.length; i += batchSize) {
    const batch = messagesToInsert.slice(i, i + batchSize);
    let { data, error: mErr } = await db.from('messages').insert(batch).select('id, phone_number');
    
    if (mErr && mErr.message.includes('message_type')) {
      const fallback = batch.map(({ message_type, ...rest }: any) => {
        const copy = { ...rest };
        return copy;
      });
      const { data: retryData, error: retryErr } = await db.from('messages').insert(fallback).select('id, phone_number');
      data = retryData;
      mErr = retryErr;
    }

    if (mErr) {
      console.error(`[Campaign Worker] Batch insert failed:`, mErr);
      await db.from('campaigns').update({ status: 'failed', error: mErr.message }).eq('id', campaignId);
      throw mErr;
    }
    if (data) {
      insertedMsgs.push(...data);
    }
  }

  // Push individual message sending jobs to BullMQ message-queue in bulk
  const jobs = insertedMsgs.map((m: any) => {
    const rawMsg = messagesToInsert.find(rti => rti.phone_number === m.phone_number);
    const variables = rawMsg?.variables || [];
    
    return {
      name: 'send-whatsapp',
      data: {
        messageId: m.id,
        phone: m.phone_number,
        templateId: (campaign.templates as any).name,
        templateLanguage: (campaign.templates as any).language || 'en_US',
        params: variables.map((v: any) => ({ type: 'text', text: String(v) })),
        isDirectText: false
      }
    };
  });

  console.log(`[Campaign Worker] Queuing ${jobs.length} sending jobs into BullMQ...`);
  await messageQueue.addBulk(jobs);

  // Update campaign status to 'completed'
  await db.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
  console.log(`[Campaign Worker] Campaign ${campaignId} processed successfully!`);

}, {
  connection: connection as any,
  lockDuration: 120000,
  stalledInterval: 60000,
  maxStalledCount: 3
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
    const jobs = messages.map((msg: any) => {
      const dbType = msg.message_type;
      const mediaPath = msg.media_path;
      const hasMediaPath = !!mediaPath;
      const isMedia = ['image', 'video', 'audio', 'document'].includes(dbType) || hasMediaPath;
      const templateName = (msg.campaigns?.templates as any)?.name || msg.template_name; // Check for future template_name column
      const isDirectText = !templateName && !msg.campaign_id && (!isMedia && (dbType === 'text' || !dbType));
      
      return {
        name: 'send-whatsapp',
        data: {
          messageId: msg.id,
          phone: msg.phone_number,
          templateId: (msg.campaigns?.templates as any)?.name,
          templateLanguage: (msg.campaigns?.templates as any)?.language || 'en_US', 
          params: [],
          isDirectText,
          textContent: msg.content,
          isMedia,
          mediaType: isMedia ? (['image', 'video', 'audio', 'document'].includes(dbType) ? dbType : 'document') : null,
          mediaPath,
          caption: msg.content || '', 
          fileName: msg.content || (mediaPath ? mediaPath.split('/').pop() : 'file')
        }
      };
    });

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

import { PLANS, PlanType, getActivePlanType } from './src/lib/plans';

// ---------------------------------------------------------
// 3. Storage TTL Cleanup (Runs Daily)
// ---------------------------------------------------------
cron.schedule('0 3 * * *', async () => {
  console.log('[Cleanup] Starting hourly storage retention check...');
  
  try {
    // 1. Get all tenants to check their plan retention
    const { data: tenants } = await db.from('tenants').select('id, plan_type');
    if (!tenants) return;

    for (const tenant of tenants) {
      const plan = PLANS[getActivePlanType(tenant.plan_type)];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - plan.mediaRetentionDays);

      // 2. Find messages with media that are past their TTL
      const { data: oldMessages } = await db.from('messages')
        .select('id, media_path, media_size_bytes')
        .eq('tenant_id', tenant.id)
        .not('media_path', 'is', null)
        .lte('created_at', expiryDate.toISOString());

      if (!oldMessages || oldMessages.length === 0) continue;

      console.log(`[Cleanup] Purging ${oldMessages.length} expired files for tenant ${tenant.id}`);
      
      const pathsToDelete = oldMessages.map((m: any) => m.media_path);
      const totalFreedBytes = oldMessages.reduce((acc: number, m: any) => acc + (Number(m.media_size_bytes) || 0), 0);

      // 3. Delete from Supabase Storage
      const { error: storageError } = await db.storage.from('chat-media').remove(pathsToDelete);
      
      if (!storageError) {
        // 4. Clear metadata from DB
        await db.from('messages')
          .update({ media_path: null, media_url: null, media_size_bytes: null })
          .in('id', oldMessages.map((m: any) => m.id));

        // 5. Update tenant storage tally (Decrement)
        const { data: t } = await db.from('tenants').select('storage_usage_bytes').eq('id', tenant.id).single();
        const currentUsage = Number(t?.storage_usage_bytes || 0);
        await db.from('tenants')
          .update({ storage_usage_bytes: Math.max(0, currentUsage - totalFreedBytes) })
          .eq('id', tenant.id);
          
        console.log(`[Cleanup] Done. Freed ${Math.round(totalFreedBytes / 1024 / 1024)}MB`);
      } else {
        console.error(`[Cleanup] Storage deletion failed for tenant ${tenant.id}:`, storageError);
      }
    }
  } catch (err) {
    console.error('[Cleanup] Fatal Error:', err);
  }
});
