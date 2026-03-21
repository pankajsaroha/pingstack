import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendMetaTemplateMessage, sendMetaTextMessage } from './src/lib/whatsapp';
import { sendWhatsAppMessage, sendWhatsAppTextMessage } from './src/lib/gupshup';
import { db } from './src/lib/db';
import { decrypt } from './src/lib/encryption';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Check .env.local path.');
}

const worker = new Worker('message-queue', async (job: Job) => {
  const { messageId, phone, templateId, templateLanguage, components, isDirectText, textContent } = job.data;

  console.log(`Fetching WhatsApp credentials for message ${messageId}...`);
  
  const { data: message, error: dbError } = await db.from('messages').select('tenant_id').eq('id', messageId).single();
  if (dbError || !message) {
    console.error(`❌ DB Error fetching message ${messageId}:`, dbError);
    throw new Error('Message not found or RLS denial');
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
  console.log(`Processing ${provider} message ${messageId} for ${phone}`);
  
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

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});

console.log('Worker is running with multi-provider support...');

