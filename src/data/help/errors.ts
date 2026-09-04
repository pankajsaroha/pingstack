import { HelpArticle } from './types';

export const errorArticles: HelpArticle[] = [
  {
    id: 'error_133010',
    title: 'Meta Error 133010: Account Not Registered',
    category: 'errors',
    errorCode: 133010,
    keywords: [
      '133010',
      'account not registered',
      'phone not registered',
      'meta error 133010',
      'two step verification',
      'pin error'
    ],
    summary: 'The phone number has been linked to your WABA but is not registered with Meta Cloud API.',
    explanation: 'Meta Cloud API requires a one-time registration handshake with a 6-digit two-step verification PIN before accepting messages.',
    whatHappened: 'WhatsApp Cloud API rejected the request because the phone number is not currently registered for live traffic.',
    steps: [
      'Go to your Pingstack Dashboard.',
      'If you see the amber "Meta Setup Pending Approval" banner, click "Register Number Now".',
      'If the error persists, click "Reset Connection" and complete Embedded Signup once more to re-issue the Cloud API registration certificate.',
      'Check that your phone number is not simultaneously active on the physical WhatsApp Mobile App.'
    ],
    action: {
      label: 'Open Dashboard',
      href: '/dashboard'
    },
    relatedArticleIds: ['meta_phone_pending', 'connect_whatsapp_meta']
  },
  {
    id: 'error_132001',
    title: 'Meta Error 132001: Template Name Does Not Exist',
    category: 'errors',
    errorCode: 132001,
    keywords: [
      '132001',
      'template name does not exist',
      'template not found',
      'meta error 132001',
      'missing template',
      'template mismatch'
    ],
    summary: 'The template name or language code requested does not match an approved template in Meta.',
    explanation: 'WhatsApp requires template names, languages (e.g. en_US vs en), and variable counts to match Meta\'s approved version exactly.',
    whatHappened: 'WhatsApp Cloud API could not locate an approved template matching the name or language specified in your campaign payload.',
    steps: [
      'Check the "Templates" page to confirm the template status is "APPROVED" (not PENDING or REJECTED).',
      'Verify that the language selected in your campaign matches the approved template language.',
      'Ensure the number of dynamic variables (e.g., {{1}}, {{2}}) passed in your campaign matches the template definition.'
    ],
    action: {
      label: 'Check Templates',
      href: '/templates'
    },
    relatedArticleIds: ['create_template', 'template_pending', 'template_rejected']
  },
  {
    id: 'error_131049',
    title: 'Meta Error 131049: Ecosystem Engagement Limit',
    category: 'errors',
    errorCode: 131049,
    keywords: [
      '131049',
      'ecosystem engagement limit',
      'meta error 131049',
      'engagement limits',
      'marketing message undelivered',
      'spam limit'
    ],
    summary: 'Message was not delivered due to WhatsApp\'s ecosystem health and user engagement safeguards.',
    explanation: 'WhatsApp automatically throttles marketing broadcasts to specific users if they have received too many business messages recently or rarely open marketing messages.',
    whatHappened: 'To protect the WhatsApp ecosystem from user fatigue, Meta prevented this marketing message from being delivered to this particular user at this moment.',
    steps: [
      'This is an automatic WhatsApp protection algorithm and does not indicate a defect in your Pingstack account.',
      'You are NOT charged by Meta for messages blocked by ecosystem engagement limits.',
      'Try messaging this contact at a later time or use Utility templates for critical account/order notifications.'
    ],
    action: {
      label: 'Review Campaigns',
      href: '/campaigns'
    },
    relatedArticleIds: ['campaign_partially_delivered', 'meta_tier_limits']
  },
  {
    id: 'error_131026',
    title: 'Meta Error 131026: Message Could Not Be Delivered',
    category: 'errors',
    errorCode: 131026,
    keywords: [
      '131026',
      'message could not be delivered',
      'undeliverable',
      'meta error 131026',
      'number not on whatsapp',
      'delivery failed'
    ],
    summary: 'WhatsApp was unable to deliver the message to the destination phone number.',
    explanation: 'This occurs when the recipient does not have an active WhatsApp account, has blocked the number, or has network issues.',
    whatHappened: 'WhatsApp Cloud API reached out to the recipient\'s device, but the connection could not be established.',
    steps: [
      'Verify that the recipient\'s phone number is correct and includes the full country code.',
      'Confirm that the recipient has WhatsApp installed and active on their mobile device.',
      'Check if the recipient previously blocked or reported your business number.',
      'If the number is valid, the user\'s phone may simply be switched off or offline.'
    ],
    action: {
      label: 'Review Contacts',
      href: '/contacts'
    },
    relatedArticleIds: ['phone_number_format', 'campaign_partially_delivered']
  },
  {
    id: 'error_131047',
    title: 'Meta Error 131047: Re-engagement Message Required (24h Window)',
    category: 'errors',
    errorCode: 131047,
    keywords: [
      '131047',
      're engagement',
      '24 hour window closed',
      'meta error 131047',
      'session expired',
      'outside 24 hours'
    ],
    summary: 'Cannot send free-form message because more than 24 hours have passed since the customer\'s last message.',
    explanation: 'WhatsApp policy mandates that any business message sent outside the 24-hour customer service window must use an approved template.',
    whatHappened: 'A free-form text or media message was attempted, but the recipient\'s 24-hour conversation window has closed.',
    steps: [
      'Use an approved WhatsApp template to re-engage the customer.',
      'Once the customer replies to your template message, the 24-hour window will reopen for free-form responses.',
      'Go to Templates to create or select a re-engagement template.'
    ],
    action: {
      label: 'View Templates',
      href: '/templates'
    },
    relatedArticleIds: ['customer_service_window', 'create_template']
  },
  {
    id: 'error_130429',
    title: 'Meta Error 130429: Cloud API Rate Limit Hit',
    category: 'errors',
    errorCode: 130429,
    keywords: [
      '130429',
      'rate limit',
      'meta error 130429',
      'too many requests',
      'throughput limit'
    ],
    summary: 'The rate of API requests sent to Meta Cloud API exceeded the allowed throughput per second.',
    explanation: 'Meta Cloud API enforces throughput limits (typically 80 to 250 requests per second per phone number).',
    whatHappened: 'Too many messages were dispatched simultaneously, triggering Meta\'s burst rate limiter.',
    steps: [
      'Pingstack\'s background worker automatically retries rate-limited messages with exponential backoff.',
      'You do not need to resend the failed messages manually; the queue manager handles it.',
      'To increase throughput limits for high-volume broadcasts, request a throughput upgrade in Meta Business Manager.'
    ],
    action: {
      label: 'View Dashboard',
      href: '/dashboard'
    },
    relatedArticleIds: ['meta_tier_limits', 'create_campaign']
  },
  {
    id: 'error_190',
    title: 'Meta Error 190: Access Token Expired or Invalidated',
    category: 'errors',
    errorCode: 190,
    keywords: [
      '190',
      'access token expired',
      'invalid token',
      'meta error 190',
      'session expired',
      'reauthenticate'
    ],
    summary: 'Your Meta Cloud API authorization token has expired or was invalidated.',
    explanation: 'This occurs if your Facebook password was changed, permissions were revoked, or system user token expired in Meta Business Manager.',
    whatHappened: 'Pingstack cannot communicate with Meta Cloud API because the authorization token is no longer valid.',
    steps: [
      'Navigate to your Dashboard.',
      'In the Connection Manager card, click "Switch Phone / Re-discover" or "Reset Connection".',
      'Log in through Facebook again to generate a fresh, permanent System User access token.',
      'Verify that the active connection badge turns green.'
    ],
    action: {
      label: 'Reconnect WhatsApp',
      href: '/dashboard'
    },
    relatedArticleIds: ['connect_whatsapp_meta', 'switch_whatsapp_number']
  }
];
