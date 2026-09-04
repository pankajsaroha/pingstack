import { HelpArticle } from './types';

export const developerArticles: HelpArticle[] = [
  {
    id: 'developer_api_keys',
    title: 'How to generate API keys and send messages via REST API',
    category: 'developer',
    keywords: [
      'api keys',
      'developer',
      'rest api',
      'send api',
      'curl',
      'integration',
      'sdk',
      'webhook'
    ],
    summary: 'Integrate Pingstack directly with your backend, CRM, or Shopify store using API keys.',
    explanation: 'Pingstack provides high-performance REST endpoints for programmatic message dispatching and contact synchronization.',
    whatHappened: 'You want to automate WhatsApp notifications for order confirmations, OTPs, or customer triggers.',
    steps: [
      'Navigate to the "Dashboard" and click on the "API Keys & Integrations" tab.',
      'Click "Generate New API Key" and give it a descriptive name (e.g., "Shopify Production").',
      'Store your API Secret Key safely — it is only displayed once upon generation.',
      'Use the Bearer token in the `Authorization: Bearer <API_KEY>` header to call endpoints like `POST /api/v1/messages/send`.'
    ],
    action: {
      label: 'Open Developer Portal',
      href: '/dashboard'
    },
    relatedArticleIds: ['webhooks_setup', 'create_template']
  },
  {
    id: 'webhooks_setup',
    title: 'How to configure Webhooks for incoming messages & delivery status updates',
    category: 'developer',
    keywords: [
      'webhooks',
      'webhook url',
      'inbound webhook',
      'delivery webhook',
      'realtime events',
      'callback'
    ],
    summary: 'Receive instant HTTP POST callbacks whenever a customer replies or a message status changes.',
    explanation: 'Webhooks allow your custom backend or Zapier workflows to react in real time to WhatsApp events.',
    whatHappened: 'You want real-time notification in your own application when messages are delivered, read, or received.',
    steps: [
      'Navigate to "API Keys & Integrations" tab on your Dashboard.',
      'Scroll to the Webhook Configuration card and enter your HTTPS endpoint URL.',
      'Set an optional Webhook Secret for HMAC SHA-256 signature verification.',
      'Test your endpoint using the "Send Test Payload" button to verify signature validation.'
    ],
    action: {
      label: 'Configure Webhooks',
      href: '/dashboard'
    },
    relatedArticleIds: ['developer_api_keys', 'message_delivery_statuses']
  }
];
