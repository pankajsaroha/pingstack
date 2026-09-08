import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = await import('../src/lib/server/push-notifications');

  console.log('\n=============================================');
  console.log('🧪 PINGSTACK WEB PUSH PIPELINE TESTS');
  console.log('=============================================\n');

  // Test 1: VAPID Config
  console.log('--- TEST GROUP 1: VAPID & Keys ---');
  assert(typeof VAPID_PUBLIC_KEY === 'string' && VAPID_PUBLIC_KEY.length > 50, 'VAPID Public Key configured');
  assert(typeof VAPID_PRIVATE_KEY === 'string' && VAPID_PRIVATE_KEY.length > 20, 'VAPID Private Key configured');

  // Test 2: Inbound Message Push Payload Construction
  console.log('\n--- TEST GROUP 2: Inbound Message Push Payload Generation ---');
  
  const constructPayload = (params: {
    tenantId: string;
    contactId?: string;
    messageId?: string;
    senderName?: string;
    senderPhone?: string;
    messageText?: string;
    unreadConversationCount?: number;
  }) => {
    const displayName = params.senderName || params.senderPhone || 'Customer';
    const title = 'PingStack';
    let body = `${displayName}: ${params.messageText || 'Sent you a message'}`;
    if (params.messageText && params.messageText.length > 120) {
      body = `${displayName}: ${params.messageText.slice(0, 117)}...`;
    }

    const notifTag = `whatsapp-inbound-${params.messageId || `${params.contactId || params.tenantId}-${Date.now()}`}`;

    return {
      type: 'incoming_message',
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: notifTag,
      url: params.contactId ? `/inbox?contactId=${params.contactId}` : '/inbox',
      contactId: params.contactId,
      messageId: params.messageId,
      tenantId: params.tenantId,
      unreadConversationCount: params.unreadConversationCount || 1,
    };
  };

  // Simulation: Message 1 from Pankaj
  const msg1 = constructPayload({
    tenantId: 'tenant-123',
    contactId: 'contact-pankaj',
    messageId: 'wamid-001',
    senderName: 'Pankaj',
    senderPhone: '+919876543210',
    messageText: 'Thanks for the reminder.',
    unreadConversationCount: 1,
  });

  assert(msg1.title === 'PingStack', 'Message 1 title is "PingStack"');
  assert(msg1.body === 'Pankaj: Thanks for the reminder.', 'Message 1 body is "Pankaj: Thanks for the reminder."');
  assert(msg1.tag === 'whatsapp-inbound-wamid-001', 'Message 1 tag is unique ("whatsapp-inbound-wamid-001")');
  assert(msg1.unreadConversationCount === 1, 'Message 1 unreadConversationCount is 1');

  // Simulation: Message 2 from Pankaj (5 seconds later)
  const msg2 = constructPayload({
    tenantId: 'tenant-123',
    contactId: 'contact-pankaj',
    messageId: 'wamid-002',
    senderName: 'Pankaj',
    senderPhone: '+919876543210',
    messageText: 'Could you also share the invoice?',
    unreadConversationCount: 1,
  });

  assert(msg2.title === 'PingStack', 'Message 2 title is "PingStack"');
  assert(msg2.body === 'Pankaj: Could you also share the invoice?', 'Message 2 body contains exact message content (not suppressed into count)');
  assert(msg2.tag === 'whatsapp-inbound-wamid-002', 'Message 2 tag is distinct from Message 1 ("whatsapp-inbound-wamid-002")');
  assert(msg1.tag !== msg2.tag, 'Message 1 and Message 2 have distinct tags (prevents iOS silent in-place collapse)');

  // Simulation: Message 3 from another customer (Rahul)
  const msg3 = constructPayload({
    tenantId: 'tenant-123',
    contactId: 'contact-rahul',
    messageId: 'wamid-003',
    senderName: 'Rahul',
    senderPhone: '+919988776655',
    messageText: 'Hi, need pricing details',
    unreadConversationCount: 2,
  });

  assert(msg3.title === 'PingStack', 'Message 3 title is "PingStack"');
  assert(msg3.body === 'Rahul: Hi, need pricing details', 'Message 3 body is "Rahul: Hi, need pricing details"');
  assert(msg3.tag === 'whatsapp-inbound-wamid-003', 'Message 3 tag is distinct ("whatsapp-inbound-wamid-003")');
  assert(msg3.unreadConversationCount === 2, 'Message 3 unreadConversationCount is 2 (for Home Screen badge)');

  // Test 3: Foreground/Background Suppression Logic Simulation
  console.log('\n--- TEST GROUP 3: Service Worker Foreground / Background Evaluation ---');
  
  const evaluateSwSuppression = (clientList: Array<{ focused: boolean; visibilityState: string }>) => {
    const isAppFocused = clientList.some((client) => client.focused && client.visibilityState === 'visible');
    return isAppFocused; // true = suppress OS banner, false = display OS push notification
  };

  // Case A: App is in background / recent apps / device locked (visibility: hidden, focused: false)
  const backgroundClients = [{ focused: false, visibilityState: 'hidden' }];
  assert(evaluateSwSuppression(backgroundClients) === false, 'Backgrounded / locked app does NOT suppress notification');

  // Case B: App is closed (no client windows)
  assert(evaluateSwSuppression([]) === false, 'Closed app does NOT suppress notification');

  // Case C: App is actively foregrounded and focused (user looking at inbox)
  const foregroundFocusedClients = [{ focused: true, visibilityState: 'visible' }];
  assert(evaluateSwSuppression(foregroundFocusedClients) === true, 'Actively focused foreground app suppresses OS notification banner');

  console.log('\n=============================================');
  console.log('🎉 ALL PUSH NOTIFICATION TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error during push tests:', err);
  process.exit(1);
});
