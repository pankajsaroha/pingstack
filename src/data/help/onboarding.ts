import { HelpArticle } from './types';

export const onboardingArticles: HelpArticle[] = [
  {
    id: 'connect_whatsapp_meta',
    title: 'How to connect your WhatsApp Business Account',
    category: 'onboarding',
    keywords: [
      'connect whatsapp',
      'meta embedded signup',
      'facebook login',
      'link phone number',
      'waba',
      'onboarding',
      'setup whatsapp',
      'how to connect'
    ],
    summary: 'Connect your official WhatsApp Business number via Meta Cloud API Embedded Signup.',
    explanation: 'Pingstack uses the official Meta WhatsApp Cloud API for direct message routing without intermediaries.',
    whatHappened: 'To send campaigns and manage live chats, you need to link a Meta WhatsApp Business Account (WABA) and a verified phone number.',
    steps: [
      'Click "Connect Meta WhatsApp" on your Dashboard or follow the Onboarding Wizard.',
      'Log in with the Facebook account that has Admin access to your Meta Business Portfolio.',
      'Select or create your Meta Business Account and WhatsApp Business Account (WABA).',
      'Provide your business phone number and verify it via SMS or voice call OTP.',
      'Accept the permissions and click Finish to return to Pingstack.'
    ],
    action: {
      label: 'Open Dashboard Setup',
      href: '/dashboard'
    },
    relatedArticleIds: ['switch_whatsapp_number', 'meta_phone_pending', 'what_to_do_after_connecting']
  },
  {
    id: 'what_to_do_after_connecting',
    title: 'What to do after connecting WhatsApp',
    category: 'onboarding',
    keywords: [
      'next steps',
      'after connect',
      'after connecting',
      'getting started',
      'what next',
      'first message'
    ],
    summary: 'Follow these 3 simple steps to launch your first WhatsApp broadcast.',
    explanation: 'Once your number is connected and active with Meta Cloud API, follow the standard workflow to start messaging.',
    whatHappened: 'Your WhatsApp connection is live! To send proactive messages to customers, WhatsApp requires approved message templates.',
    steps: [
      'Step 1: Create a message template under "Templates" and submit it for Meta approval.',
      'Step 2: Add or import your customer list under "Contacts" (or create a Contact Group).',
      'Step 3: Head to "Campaigns" and launch a broadcast using your approved template.'
    ],
    action: {
      label: 'Create a Template',
      href: '/templates'
    },
    relatedArticleIds: ['create_template', 'import_contacts', 'create_campaign']
  },
  {
    id: 'meta_phone_pending',
    title: 'Why is my WhatsApp number status "PENDING" or "UNVERIFIED"?',
    category: 'onboarding',
    keywords: [
      'pending status',
      'unverified',
      'phone pending',
      'meta pending',
      'registration failed',
      'register number now'
    ],
    summary: 'Your phone number has been linked to Meta, but final Cloud API registration is finishing.',
    explanation: 'Meta requires registering a 2-step verification PIN with their Cloud API before the number can transmit live traffic.',
    whatHappened: 'Meta has granted access to your number, but the Cloud API certificate registration is awaiting completion.',
    steps: [
      'Look for the amber banner on your Dashboard stating "Meta Setup Pending Approval".',
      'Click the "Register Number Now" button in the banner.',
      'Wait a few moments for Pingstack to register the 6-digit PIN with Meta Cloud API.',
      'Refresh the page — your connection status will switch to "Active Connection".'
    ],
    action: {
      label: 'Go to Dashboard',
      href: '/dashboard'
    },
    relatedArticleIds: ['connect_whatsapp_meta', 'error_133010']
  },
  {
    id: 'switch_whatsapp_number',
    title: 'How to switch or connect another WhatsApp number',
    category: 'onboarding',
    keywords: [
      'switch number',
      'change phone',
      'connect another number',
      'reset connection',
      'reconnect whatsapp',
      'new waba'
    ],
    summary: 'Switch to a different phone number or reconnect your Meta Business Account.',
    explanation: 'You can change the connected WhatsApp Business phone number associated with your workspace at any time.',
    whatHappened: 'You want to route messaging through a different phone number or Meta Business Portfolio.',
    steps: [
      'Navigate to your Dashboard.',
      'In the Connection Manager card, click "Switch Phone / Re-discover".',
      'Select a different phone number discovered from your Meta WABA account, or run Meta Embedded Signup again.',
      'If you need a complete wipe of the connection, click "Reset Connection" and re-authenticate.'
    ],
    action: {
      label: 'Manage Connection',
      href: '/dashboard'
    },
    relatedArticleIds: ['connect_whatsapp_meta', 'meta_phone_pending']
  }
];
