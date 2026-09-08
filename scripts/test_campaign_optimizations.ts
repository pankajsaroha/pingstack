function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 PINGSTACK CAMPAIGN & INBOX TESTS');
  console.log('=============================================\n');

  // Test Group 1: Mixed Selection & Deduplication Logic
  console.log('--- TEST GROUP 1: Recipient Resolution & Deduplication ---');
  
  const contacts = [
    { id: 'c1', name: 'Pankaj Saroha', phone_number: '+919876543210' },
    { id: 'c2', name: 'Amit Kumar', phone_number: '+919876543211' },
    { id: 'c3', name: 'Rahul Sharma', phone_number: '+919876543212' },
  ];

  const groupContactsMap: Record<string, any[]> = {
    'g1': [
      { id: 'c1', name: 'Pankaj Saroha', phone_number: '+919876543210' }, // Duplicate of direct contact c1
      { id: 'c4', name: 'Neha Gupta', phone_number: '+919876543213' },
    ],
    'g2': [
      { id: 'c4', name: 'Neha Gupta', phone_number: '+919876543213' }, // Duplicate across groups
      { id: 'c5', name: 'Vikram Singh', phone_number: '+919876543214' },
    ],
  };

  const resolveRecipients = (
    selectedContactIds: string[],
    selectedGroupIds: string[],
    allContacts: any[],
    groupsMap: Record<string, any[]>
  ) => {
    const byPhone = new Map<string, { id?: string; name: string; phone: string }>();

    // 1. Direct contacts
    selectedContactIds.forEach((cId) => {
      const found = allContacts.find((c) => c.id === cId);
      if (found && found.phone_number) {
        const clean = String(found.phone_number).replace(/\D/g, '');
        if (clean.length >= 7) {
          byPhone.set(clean, {
            id: found.id,
            name: found.name || 'Customer',
            phone: found.phone_number,
          });
        }
      }
    });

    // 2. Groups
    selectedGroupIds.forEach((gid) => {
      const gContacts = groupsMap[gid] || [];
      gContacts.forEach((c) => {
        if (c && c.phone_number) {
          const clean = String(c.phone_number).replace(/\D/g, '');
          if (clean.length >= 7 && !byPhone.has(clean)) {
            byPhone.set(clean, {
              id: c.id,
              name: c.name || 'Customer',
              phone: c.phone_number,
            });
          }
        }
      });
    });

    return Array.from(byPhone.values());
  };

  // Case 1: 1 direct contact
  const test1 = resolveRecipients(['c1'], [], contacts, groupContactsMap);
  assert(test1.length === 1 && test1[0].name === 'Pankaj Saroha', '1 direct contact resolved accurately');

  // Case 2: Group 1 (contains 2 contacts)
  const test2 = resolveRecipients([], ['g1'], contacts, groupContactsMap);
  assert(test2.length === 2, 'Group 1 resolved 2 contacts');

  // Case 3: Mixed selection (Direct Contact c1 + Group g1 + Group g2 with cross-group duplicates)
  const test3 = resolveRecipients(['c1', 'c2'], ['g1', 'g2'], contacts, groupContactsMap);
  // c1, c2, c4, c5 => exactly 4 unique recipients
  assert(test3.length === 4, 'Mixed selection with duplicates resolved to exactly 4 unique recipients');
  assert(test3.some(r => r.name === 'Pankaj Saroha'), 'Preserves Pankaj Saroha');
  assert(test3.some(r => r.name === 'Amit Kumar'), 'Preserves Amit Kumar');
  assert(test3.some(r => r.name === 'Neha Gupta'), 'Preserves Neha Gupta');
  assert(test3.some(r => r.name === 'Vikram Singh'), 'Preserves Vikram Singh');

  // Test Group 2: Variable Generic Preservation
  console.log('\n--- TEST GROUP 2: Variable Column Generic Integrity ---');
  const templateContent = 'Hello {{1}}, your appointment is on {{2}}. Amount due: {{3}}.';
  const matches = templateContent.match(/\{\{(\d+)\}\}/g) || [];
  const rawNums = Array.from(new Set(matches.map((m: string) => m.replace(/\D/g, ''))));
  const varsDetected = (rawNums as string[]).sort((a: string, b: string) => Number(a) - Number(b));

  assert(varsDetected.length === 3, 'Detected 3 dynamic variables');
  assert(varsDetected[0] === '1' && varsDetected[1] === '2' && varsDetected[2] === '3', 'Variables are generic 1, 2, 3');

  // Test Group 3: Inbox Conversations vs Broadcast Campaign Filtering
  console.log('\n--- TEST GROUP 3: Inbox Conversations vs Broadcast Campaign Filtering ---');

  interface SampleMessage {
    id: string;
    contact_id: string;
    direction: 'inbound' | 'outbound';
    campaign_id: string | null;
    content: string;
    created_at: string;
  }

  const sampleMessages: SampleMessage[] = [
    // Contact A: Only received a broadcast campaign (No reply yet)
    {
      id: 'm1',
      contact_id: 'contact_A',
      direction: 'outbound',
      campaign_id: 'camp_100',
      content: 'Broadcast promo message',
      created_at: '2026-09-08T10:00:00Z'
    },
    // Contact B: Received broadcast campaign, then replied!
    {
      id: 'm2',
      contact_id: 'contact_B',
      direction: 'outbound',
      campaign_id: 'camp_100',
      content: 'Broadcast appointment confirmation',
      created_at: '2026-09-08T10:00:00Z'
    },
    {
      id: 'm3',
      contact_id: 'contact_B',
      direction: 'inbound',
      campaign_id: null,
      content: 'Can I reschedule to 4pm?',
      created_at: '2026-09-08T10:05:00Z'
    },
    // Contact C: Direct 1:1 message initiated from Inbox
    {
      id: 'm4',
      contact_id: 'contact_C',
      direction: 'outbound',
      campaign_id: null,
      content: 'Hi Rahul, regarding your order...',
      created_at: '2026-09-08T10:10:00Z'
    }
  ];

  // Logic mirroring the updated conversations_view
  const filterActiveConversations = (messages: SampleMessage[]) => {
    // 1. Identify contacts with active interactions (inbound reply OR direct 1:1 message)
    const activeContactIds = new Set<string>();
    messages.forEach((m) => {
      if (m.direction === 'inbound' || m.campaign_id === null) {
        activeContactIds.add(m.contact_id);
      }
    });

    // 2. Pick latest message for active contacts
    const latestByContact = new Map<string, SampleMessage>();
    const sorted = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    sorted.forEach((m) => {
      if (activeContactIds.has(m.contact_id) && !latestByContact.has(m.contact_id)) {
        latestByContact.set(m.contact_id, m);
      }
    });

    return Array.from(latestByContact.values());
  };

  const activeConversations = filterActiveConversations(sampleMessages);

  assert(activeConversations.length === 2, 'Exactly 2 active conversations in Inbox (Contact A excluded from Inbox)');
  assert(!activeConversations.some(c => c.contact_id === 'contact_A'), 'Contact A (pure broadcast recipient) is NOT in Inbox list');
  assert(activeConversations.some(c => c.contact_id === 'contact_B'), 'Contact B (replied to campaign) IS in Inbox list');
  assert(activeConversations.some(c => c.contact_id === 'contact_C'), 'Contact C (1:1 chat) IS in Inbox list');

  const contactBLatest = activeConversations.find(c => c.contact_id === 'contact_B');
  assert(contactBLatest?.content === 'Can I reschedule to 4pm?', 'Contact B latest message is their reply');

  console.log('\n=============================================');
  console.log('🎉 ALL CAMPAIGN & INBOX TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
