import { HelpArticle } from './types';

export const messagingArticles: HelpArticle[] = [
  {
    id: 'send_single_message',
    title: 'How do I send a direct message to a single contact?',
    category: 'messaging',
    keywords: [
      'send message',
      'single contact',
      'send to one person',
      'direct message',
      'inbox message',
      'chat with customer'
    ],
    summary: 'Chat in real time with individual contacts using the Pingstack live Inbox.',
    explanation: 'The Inbox allows support and sales teams to manage bidirectional WhatsApp conversations.',
    whatHappened: 'You want to reply to an incoming query or start a conversation with a specific contact.',
    steps: [
      'Open the "Inbox" tab from the navigation sidebar.',
      'Select a conversation from the active chats list, or search for a contact by name/phone.',
      'If replying within 24 hours of customer\'s last message, you can send free-form text and media directly.',
      'If outside the 24-hour window, WhatsApp requires starting with an approved template.'
    ],
    action: {
      label: 'Open Live Inbox',
      href: '/inbox'
    },
    relatedArticleIds: ['customer_service_window', 'message_delivery_statuses']
  },
  {
    id: 'customer_service_window',
    title: 'What is the WhatsApp 24-hour customer service window?',
    category: 'messaging',
    keywords: [
      '24 hour window',
      'customer service window',
      'session message',
      'free message',
      'cannot send message',
      're engagement'
    ],
    summary: 'WhatsApp allows free-form messaging for 24 hours after a customer sends you an inbound message.',
    explanation: 'Outside the 24-hour window, you must use an approved WhatsApp template to reach out to the customer.',
    whatHappened: 'WhatsApp policy protects users from unsolicited spam by enforcing customer service session windows.',
    steps: [
      'When a customer messages your number, a 24-hour session window opens automatically.',
      'During this window, your team can send normal text, images, voice notes, and documents freely.',
      'Once 24 hours pass with no new message from the user, the window closes.',
      'To restart the conversation, send an approved template message (Error 131047 will occur if sending non-template text).'
    ],
    action: {
      label: 'View Inbox',
      href: '/inbox'
    },
    relatedArticleIds: ['send_single_message', 'create_template', 'error_131047']
  },
  {
    id: 'message_delivery_statuses',
    title: 'Understanding WhatsApp delivery statuses (Sent, Delivered, Read, Failed)',
    category: 'messaging',
    keywords: [
      'message status',
      'sent',
      'delivered',
      'read',
      'failed',
      'double check marks',
      'blue ticks',
      'delivery report'
    ],
    summary: 'Track real-time message progress through Meta Cloud API webhook delivery receipts.',
    explanation: 'Pingstack reflects the exact delivery lifecycle of each message sent from your workspace.',
    whatHappened: 'Messages progress through distinct lifecycle stages as Meta relays them to recipient devices.',
    steps: [
      'Sent (Single tick): The message was accepted by Meta Cloud API and dispatched to WhatsApp servers.',
      'Delivered (Double grey ticks): The message was successfully delivered to the recipient\'s device.',
      'Read (Double blue ticks): The recipient opened and read the message (if read receipts are enabled on their device).',
      'Failed (Red icon): The message could not be delivered. Hover over or click the message for the exact Meta error code.'
    ],
    action: {
      label: 'View Performance',
      href: '/dashboard'
    },
    relatedArticleIds: ['campaign_partially_delivered', 'error_131026']
  }
];
