import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BJkzpdmIBXxTYTwmd5Ryj6ZOAwTA_IJrm2hD9K2zUnekwoMlq_MgoJfo2veRUjTAgJLsf1RVHn4TpdsynxVFQXc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'lwGFJvHoU7U2eM-7uCFSt_2aXU7CTwrDpCLegUbhSr0';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@pingstack.in';

console.log('=== VAPID KEY VERIFICATION ===');
console.log('Public Key (Base64URL):', VAPID_PUBLIC_KEY);
console.log('Public Key length:', VAPID_PUBLIC_KEY.length);
console.log('Private Key length:', VAPID_PRIVATE_KEY.length);

try {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('webPush.setVapidDetails: OK');
} catch (e) {
  console.error('webPush.setVapidDetails ERROR:', e);
}

// Test VAPID headers with correct signature:
// getVapidHeaders(audience, subject, publicKey, privateKey, contentEncoding)
try {
  const sampleAudience = 'https://web.push.apple.com';
  const headers = webPush.getVapidHeaders(sampleAudience, VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, 'aes128gcm');
  console.log('Sample Apple VAPID Headers generated successfully!');
  console.log('Authorization prefix:', headers.Authorization.slice(0, 50) + '...');
} catch (e) {
  console.error('Apple VAPID Header generation ERROR:', e);
}

// Check Supabase database subscriptions and test direct push
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseKey) {
  const db = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await db.from('push_subscriptions').select('*').order('created_at', { ascending: false });
  console.log('\n=== DB PUSH SUBSCRIPTIONS ===');
  if (error) {
    console.error('Error querying push_subscriptions:', error);
  } else {
    console.log(`Found ${data.length} subscription(s).`);
    
    // Pick the most recent active subscription
    const latestSub = data.find(s => s.is_active);
    if (latestSub) {
      const url = new URL(latestSub.endpoint);
      console.log('\n----------------------------------------');
      console.log('DIRECT PUSH TEST TO LATEST SUBSCRIPTION');
      console.log('----------------------------------------');
      console.log('Subscription ID:', latestSub.id);
      console.log('Tenant ID:', latestSub.tenant_id);
      console.log('Endpoint Host:', url.protocol + '//' + url.host);
      console.log('Endpoint Path Prefix:', url.pathname.slice(0, 20) + '...');
      console.log('User Agent:', latestSub.user_agent);

      const pushSub = {
        endpoint: latestSub.endpoint,
        keys: {
          p256dh: latestSub.p256dh,
          auth: latestSub.auth,
        },
      };

      const testPayload = JSON.stringify({
        title: 'PingStack Test',
        body: 'Web Push delivery is working.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        url: '/inbox',
      });

      console.log('\nAttempting push dispatch via web-push...');
      try {
        const response = await webPush.sendNotification(pushSub, testPayload, {
          TTL: 60,
          urgency: 'high',
        });
        console.log('>>> SUCCESS RESPONSE RECEIVED FROM PUSH SERVICE <<<');
        console.log('HTTP Status Code:', response.statusCode);
        console.log('Response Headers:', {
          'apns-id': response.headers['apns-id'],
          'location': response.headers['location'],
          'content-type': response.headers['content-type'],
          'date': response.headers['date'],
        });
        console.log('Response Body:', response.body || '(empty body - standard 201 Created)');
      } catch (pushErr) {
        console.error('>>> PUSH DELIVERY FAILED <<<');
        console.error('Status Code:', pushErr.statusCode);
        console.error('Error Name:', pushErr.name);
        console.error('Error Message:', pushErr.message);
        console.error('Response Headers:', pushErr.headers);
        console.error('Response Body:', pushErr.body);
      }
    }
  }
}
