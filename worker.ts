import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendMetaTemplateMessage, sendMetaTextMessage } from './src/lib/whatsapp';
import { db } from './src/lib/db';
import { decrypt } from './src/lib/encryption';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const worker = new Worker('message-queue', async (job: Job) => {
  const { messageId, phone, templateId, templateLanguage, components, isDirectText, textContent } = job.data;

  console.log(`Fetching Meta credentials for message ${messageId}...`);
  
  const { data: message } = await db.from('messages').select('tenant_id').eq('id', messageId).single();
  if (!message) throw new Error('Message not found');

  const { data: whatsappAccount } = await db.from('whatsapp_accounts')
    .select('phone_number_id, access_token')
    .eq('tenant_id', message.tenant_id)
    .single();

  if (!whatsappAccount || !whatsappAccount.access_token || !whatsappAccount.phone_number_id) {
    await db.from('messages').update({ status: 'failed', error: 'Missing Meta credentials' }).eq('id', messageId);
    throw new Error('Tenant missing Meta credentials');
  }

  const decryptedToken = decrypt(whatsappAccount.access_token);
  const phoneNumberId = whatsappAccount.phone_number_id;

  console.log(`Processing Meta message ${messageId} for ${phone} via PhoneID: ${phoneNumberId}`);
  
  let result;
  if (isDirectText) {
    result = await sendMetaTextMessage(phoneNumberId, decryptedToken, phone, textContent);
  } else {
    // Note: for Cloud API, templateId is usually the template name
    result = await sendMetaTemplateMessage(phoneNumberId, decryptedToken, phone, templateId, templateLanguage || 'en_US', components || []);
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

console.log('Worker is running for Meta WhatsApp Cloud API...');
