import { HelpArticle } from './types';

export const campaignArticles: HelpArticle[] = [
  {
    id: 'create_campaign',
    title: 'How do I send a WhatsApp broadcast campaign?',
    category: 'campaigns',
    keywords: [
      'create campaign',
      'send broadcast',
      'send to multiple',
      'bulk message',
      'launch campaign',
      'mass message',
      'campaign setup'
    ],
    summary: 'Send personalized WhatsApp messages to hundreds or thousands of contacts at once.',
    explanation: 'Pingstack broadcasts leverage high-throughput queueing for fast delivery without risking number blocks.',
    whatHappened: 'You want to broadcast a promotional or informational message to a list of recipients.',
    steps: [
      'Go to the "Campaigns" page and click "+ New Campaign".',
      'Choose a campaign name for your internal reference.',
      'Select an approved WhatsApp message template.',
      'Choose your target audience: select a Contact Group or upload a direct recipient file.',
      'Map any template dynamic variables (e.g., recipient name or custom fields).',
      'Choose whether to send immediately or schedule for a future date/time.',
      'Click "Launch Campaign" to begin dispatching messages.'
    ],
    action: {
      label: 'Create Campaign',
      href: '/campaigns'
    },
    relatedArticleIds: ['campaign_partially_delivered', 'meta_tier_limits', 'create_template']
  },
  {
    id: 'campaign_partially_delivered',
    title: 'Why was my campaign partially delivered or shows failed messages?',
    category: 'campaigns',
    keywords: [
      'partially delivered',
      'failed messages',
      'campaign failure',
      'undelivered',
      'why did campaign fail',
      'some messages failed'
    ],
    summary: 'Understand why certain messages in a campaign may fail or remain undelivered.',
    explanation: 'WhatsApp delivery can fail for specific numbers due to inactive accounts, rate limits, or engagement boundaries.',
    whatHappened: 'Certain recipients did not receive the broadcast message. Pingstack tracks the exact reason for each recipient.',
    steps: [
      'Recipient number issue: Verify the recipient\'s number has the correct country code and is actively registered on WhatsApp (Error 131026 / 133010).',
      'Ecosystem engagement limit: Meta may restrict high-volume marketing to users who rarely engage or opt out (Error 131049).',
      'Daily Tier limit reached: Check if your Meta WhatsApp Business daily sending limit (Tier 1K, 10K, etc.) was exhausted.',
      'Inspect detailed campaign logs under "Campaigns" to see individual recipient delivery statuses.'
    ],
    action: {
      label: 'View Campaigns',
      href: '/campaigns'
    },
    relatedArticleIds: ['meta_tier_limits', 'error_131049', 'error_131026']
  },
  {
    id: 'meta_tier_limits',
    title: 'How do WhatsApp daily sending limits (Tier 1K, 10K, 100K) work?',
    category: 'campaigns',
    keywords: [
      'sending limits',
      'daily limits',
      'tier 1k',
      'tier 10k',
      'messaging limit',
      'tier upgrade',
      'how many messages per day'
    ],
    summary: 'Meta assigns daily messaging tiers based on your phone number quality rating and messaging volume.',
    explanation: 'Messaging limits determine the number of unique business-initiated conversations you can start in a rolling 24-hour window.',
    whatHappened: 'WhatsApp automatically tiers accounts into 1,000, 10,000, 100,000, or Unlimited daily unique conversations.',
    steps: [
      'New numbers start at Tier 1 (1,000 unique customers / 24 hours).',
      'Tier 2: 10,000 unique customers / 24 hours.',
      'Tier 3: 100,000 unique customers / 24 hours.',
      'Tier 4: Unlimited unique customers.',
      'To upgrade tiers automatically: Maintain a "High" or "Medium" phone number quality rating in Meta Business Manager and send at least 50% of your current tier limit over 7 days.'
    ],
    action: {
      label: 'View Workspace Limits',
      href: '/dashboard'
    },
    relatedArticleIds: ['campaign_partially_delivered', 'create_campaign']
  }
];
