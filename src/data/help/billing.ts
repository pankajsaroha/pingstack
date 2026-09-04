import { HelpArticle } from './types';

export const billingArticles: HelpArticle[] = [
  {
    id: 'free_trial_and_plans',
    title: 'How does the Pingstack 15-day free trial and plan upgrades work?',
    category: 'billing',
    keywords: [
      'free trial',
      'plans',
      'pricing',
      'upgrade',
      'subscription',
      'starter plan',
      'pro plan',
      'enterprise'
    ],
    summary: 'Pingstack provides a 15-day full-featured Starter trial with no credit card required upfront.',
    explanation: 'Experience all features including bulk campaigns, multi-agent inbox, and contacts import during your trial.',
    whatHappened: 'You want to understand subscription plans, trial expiration, or how to upgrade your workspace.',
    steps: [
      'Every new workspace receives 15 days of free access on the Starter tier.',
      'To upgrade at any time, click "Upgrade Now" in the top banner or visit the Pricing page.',
      'Select between Starter, Growth, or Pro plans depending on your required contact volumes and team seats.',
      'Payments are processed securely via Razorpay with support for UPI, Cards, NetBanking, and auto-renewals.'
    ],
    action: {
      label: 'View Pricing Plans',
      href: '/pricing'
    },
    relatedArticleIds: ['meta_conversation_charges', 'meta_tier_limits']
  },
  {
    id: 'meta_conversation_charges',
    title: 'How Meta Cloud API conversation charges work vs Pingstack subscription',
    category: 'billing',
    keywords: [
      'meta charges',
      'conversation charges',
      'whatsapp cost',
      'marketing conversation',
      'utility conversation',
      'meta billing'
    ],
    summary: 'Understand the difference between Pingstack software subscription and Meta conversation fees.',
    explanation: 'Pingstack connects directly to your own Meta Cloud API account, meaning Meta charges conversation fees directly to your payment method with 0% markup.',
    whatHappened: 'WhatsApp charges businesses on a per-conversation basis (Marketing, Utility, Authentication, Service).',
    steps: [
      'Pingstack charges a flat SaaS software subscription for platform features, queues, and multi-agent inbox.',
      'Meta conversation charges (e.g., Marketing ~₹0.78 / conv in India) are billed directly by Meta to the credit card linked in your Meta Business Portfolio.',
      'You get 1,000 free Service (user-initiated) conversations per month from Meta on each WhatsApp Business Account.',
      'Configure a monthly Meta budget alert in your Dashboard to monitor your spend.'
    ],
    action: {
      label: 'View Meta Cost Tracker',
      href: '/dashboard'
    },
    relatedArticleIds: ['free_trial_and_plans', 'create_campaign']
  }
];
