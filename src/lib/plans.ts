export type PlanType = 'starter' | 'growth' | 'pro';

export interface PlanLimits {
  templateSendsPerDay: number;
  maxCampaignsPerDay: number; // Backward compatibility alias
  maxContacts: number;
  maxSavedTemplates: number;
  maxCustomFields: number;
  maxAutomationRules: number;
  maxStorageMb: number;
  maxFileSizeMb: number;
  mediaRetentionDays: number;
  features: string[];
}

export interface PlanConfig {
  id: PlanType;
  name: string;
  badge?: string;
  popular?: boolean;
  comingSoon?: boolean;
  originalPriceFormatted?: string;
  priceFormatted: string;
  periodFormatted: string;
  offerNote?: string;
  tagline: string;
  ctaText: string;
  limits: PlanLimits;
  highlightFeatures: string[];
  disabled?: boolean;
}

export interface FeatureCategory {
  category: string;
  features: {
    name: string;
    description?: string;
    starter: string | boolean;
    growth: string | boolean;
    pro: string | boolean;
    comingSoon?: boolean;
    tooltip?: string;
  }[];
}

export const PLANS: Record<PlanType, PlanLimits> = {
  starter: {
    templateSendsPerDay: 100,
    maxCampaignsPerDay: 100,
    maxContacts: 500,
    maxSavedTemplates: 10,
    maxCustomFields: 0,
    maxAutomationRules: 0,
    maxStorageMb: 50,
    maxFileSizeMb: 5,
    mediaRetentionDays: 30,
    features: [
      '100 template sends/day',
      'Up to 500 contacts',
      'Shared inbox',
      '10 saved templates',
      '30-day message history'
    ]
  },
  growth: {
    templateSendsPerDay: 500,
    maxCampaignsPerDay: 500,
    maxContacts: 2500,
    maxSavedTemplates: 50,
    maxCustomFields: 20,
    maxAutomationRules: 3,
    maxStorageMb: 500,
    maxFileSizeMb: 15,
    mediaRetentionDays: 90,
    features: [
      '500 template sends/day',
      'Up to 2,500 contacts',
      '50 saved templates',
      'Scheduled campaigns',
      'Custom contact fields',
      '90-day message history',
      'Priority support'
    ]
  },
  pro: {
    templateSendsPerDay: 2000,
    maxCampaignsPerDay: 2000,
    maxContacts: 10000,
    maxSavedTemplates: Infinity,
    maxCustomFields: Infinity,
    maxAutomationRules: Infinity,
    maxStorageMb: 5120, // 5GB
    maxFileSizeMb: 64,   // WhatsApp global max
    mediaRetentionDays: 365,
    features: [
      '2,000 template sends/day',
      'Up to 10,000 contacts',
      'Unlimited saved templates',
      '1-year message history',
      'Shared team inbox (Roadmap)',
      'Developer API (Roadmap)',
      'Advanced automation (Roadmap)'
    ]
  }
};

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    badge: 'Free during early access',
    originalPriceFormatted: '₹199',
    priceFormatted: 'FREE',
    periodFormatted: '',
    offerNote: 'Launch offer • Free from Pingstack',
    tagline: 'Everything you need to start managing WhatsApp professionally.',
    ctaText: 'Get Started',
    popular: false,
    comingSoon: false,
    limits: PLANS.starter,
    highlightFeatures: [
      'Connect WhatsApp Business',
      'Send & receive WhatsApp messages',
      'Shared inbox',
      'Up to 500 contacts',
      'Contact groups/tags & CSV import',
      'WhatsApp message templates & variables',
      'Send to individual & multiple contacts',
      'Broadcast campaigns & basic reporting',
      '100 template sends/day',
      '10 saved templates',
      '30-day message history'
    ]
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    badge: 'Early Access',
    popular: true,
    originalPriceFormatted: '₹499',
    priceFormatted: '₹199',
    periodFormatted: '/ month',
    offerNote: '₹199/month during early access',
    tagline: 'For businesses that need more contacts, campaigns and automation.',
    ctaText: 'Start with Growth',
    comingSoon: false,
    limits: PLANS.growth,
    highlightFeatures: [
      'Everything in Starter, plus:',
      'Up to 2,500 contacts',
      '500 template sends/day',
      '50 saved templates',
      'Scheduled campaigns',
      'Campaign pause/resume',
      'Advanced campaign reporting & CSV export',
      'Custom contact fields (up to 20)',
      '90-day message history',
      'Basic automation (up to 3 rules)',
      'Priority support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Coming Soon',
    comingSoon: true,
    priceFormatted: '₹999',
    periodFormatted: '/ month',
    tagline: 'For businesses ready to automate and integrate WhatsApp.',
    ctaText: 'Coming Soon',
    popular: false,
    disabled: true,
    limits: PLANS.pro,
    highlightFeatures: [
      'Everything in Growth, plus:',
      'Up to 10,000 contacts',
      '2,000 template sends/day',
      'Unlimited saved templates & campaigns',
      '1-year message history',
      'Advanced automation',
      'Shared team inbox (Coming Soon)',
      'Team members & assignment (Coming Soon)',
      'Developer API & Webhooks (Coming Soon)',
      'API usage dashboard (Coming Soon)',
      'Advanced analytics & reporting'
    ]
  }
};

export const FEATURE_COMPARISON_CATEGORIES: FeatureCategory[] = [
  {
    category: 'WhatsApp',
    features: [
      {
        name: 'WhatsApp connection',
        description: 'Direct connection to Meta Cloud API with 0% message markup',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Send & receive messages',
        description: 'Two-way real-time messaging with media support',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Shared inbox',
        description: 'Unified workspace inbox for your messaging operations',
        starter: 'Single shared',
        growth: 'Single shared',
        pro: 'Shared team inbox'
      }
    ]
  },
  {
    category: 'Contacts',
    features: [
      {
        name: 'Contacts',
        description: 'Total active contacts stored in your workspace',
        starter: 'Up to 500',
        growth: 'Up to 2,500',
        pro: 'Up to 10,000'
      },
      {
        name: 'Groups/tags',
        description: 'Organize customers for targeted broadcast campaigns',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Excel/CSV import',
        description: 'Bulk import contacts with phone numbers and custom data',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Custom fields',
        description: 'Capture business-specific metadata per contact',
        starter: false,
        growth: 'Up to 20 fields',
        pro: 'Unlimited'
      }
    ]
  },
  {
    category: 'Messaging',
    features: [
      {
        name: 'Template messages',
        description: 'Pre-approved Meta templates for customer notifications',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Template variables',
        description: 'Personalize templates with dynamic custom variables',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Template sends/day',
        description: 'Daily allowance of template messages sent to recipients',
        tooltip: 'Template sends count the number of template messages sent to recipients. Sending a template to one recipient counts as 1 send; sending it to 100 recipients counts as 100 sends.',
        starter: '100 / day',
        growth: '500 / day',
        pro: '2,000 / day'
      },
      {
        name: 'Saved templates',
        description: 'Number of approved templates saved in your workspace',
        starter: '10 templates',
        growth: '50 templates',
        pro: 'Unlimited'
      },
      {
        name: 'Send to individual contacts',
        description: 'Direct 1-on-1 template and session messaging',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Send to multiple contacts',
        description: 'Broadcast templates to selected groups or segments',
        starter: true,
        growth: true,
        pro: true
      }
    ]
  },
  {
    category: 'Campaigns',
    features: [
      {
        name: 'Campaigns',
        description: 'Broadcast campaigns to contact lists and groups',
        starter: true,
        growth: true,
        pro: true
      },
      {
        name: 'Campaign scheduling',
        description: 'Queue campaigns to trigger automatically at a set date/time',
        starter: false,
        growth: true,
        pro: true
      },
      {
        name: 'Pause/resume',
        description: 'Pause running campaign batches and resume when ready',
        starter: false,
        growth: true,
        pro: true
      },
      {
        name: 'Reporting',
        description: 'Message delivery statuses, read rates, and performance data',
        starter: 'Basic reporting',
        growth: 'Advanced + Export',
        pro: 'Advanced + Export'
      }
    ]
  },
  {
    category: 'Automation',
    features: [
      {
        name: 'Basic automation',
        description: 'Automated welcome messages and keyword auto-replies',
        starter: false,
        growth: 'Up to 3 rules',
        pro: 'Unlimited'
      },
      {
        name: 'Advanced automation',
        description: 'Multi-step branches, intent routing, and dynamic webhooks',
        starter: false,
        growth: false,
        pro: 'Coming Soon',
        comingSoon: true
      }
    ]
  },
  {
    category: 'History',
    features: [
      {
        name: 'Message history',
        description: 'Duration of conversation logs and attachments retained',
        starter: '30 days',
        growth: '90 days',
        pro: '1 year'
      },
      {
        name: 'Media storage',
        description: 'Storage for campaign attachments, images, and documents',
        starter: '50 MB',
        growth: '500 MB',
        pro: '5 GB'
      }
    ]
  },
  {
    category: 'Team (Pro Roadmap)',
    features: [
      {
        name: 'Shared team inbox',
        description: 'Multi-seat access to the workspace inbox',
        starter: 'Single inbox',
        growth: 'Single inbox',
        pro: 'Coming Soon',
        comingSoon: true
      },
      {
        name: 'Team members',
        description: 'Multiple employee logins under one organization',
        starter: '1 user',
        growth: '1 user',
        pro: 'Coming Soon',
        comingSoon: true
      },
      {
        name: 'Conversation assignment',
        description: 'Assign conversations to specific agents',
        starter: false,
        growth: false,
        pro: 'Coming Soon',
        comingSoon: true
      },
      {
        name: 'Team collaboration',
        description: 'Internal agent notes and mentions on conversations',
        starter: false,
        growth: false,
        pro: 'Coming Soon',
        comingSoon: true
      }
    ]
  },
  {
    category: 'Developer (Pro Roadmap)',
    features: [
      {
        name: 'API',
        description: 'REST API endpoints for sending messages programmatically',
        starter: false,
        growth: false,
        pro: 'Coming Soon',
        comingSoon: true
      },
      {
        name: 'Webhooks',
        description: 'Real-time HTTP webhook events for incoming messages & status',
        starter: false,
        growth: false,
        pro: 'Coming Soon',
        comingSoon: true
      },
      {
        name: 'API usage dashboard',
        description: 'Token analytics, latency monitoring, and request logs',
        starter: false,
        growth: false,
        pro: 'Coming Soon',
        comingSoon: true
      }
    ]
  }
];

export const EARLY_ACCESS_BANNER = {
  title: 'Pingstack is currently in early access.',
  description: "Start with our free Starter plan or unlock Growth features at ₹199/month while we're building the next generation of Pingstack.",
  subtext: 'Your feedback is helping shape what comes next.'
};

export const TEMPLATE_SENDS_TOOLTIP = 'Template sends count the number of template messages sent to recipients. Sending a template to one recipient counts as 1 send; sending it to 100 recipients counts as 100 sends.';

export function getActivePlanType(planTypeRaw: string | null | undefined): PlanType {
  if (!planTypeRaw) return 'starter';
  const clean = planTypeRaw.toLowerCase().trim();
  if (clean === 'growth') return 'growth';
  if (clean === 'pro') return 'pro';
  return 'starter';
}
