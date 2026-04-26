export type PlanType = 'starter' | 'growth' | 'pro';

export interface PlanLimits {
  maxCampaignsPerDay: number;
  maxContacts: number;
  maxStorageMb: number;
  maxFileSizeMb: number;
  mediaRetentionDays: number;
  features: string[];
}

export const PLANS: Record<PlanType, PlanLimits> = {
  starter: {
    maxCampaignsPerDay: 100,
    maxContacts: 250,
    maxStorageMb: 50,
    maxFileSizeMb: 5,
    mediaRetentionDays: 7,
    features: ['100 Campaigns/day', '250 Contacts', '50MB Storage', '7-Day Retention']
  },
  growth: {
    maxCampaignsPerDay: 1000,
    maxContacts: 2500,
    maxStorageMb: 500,
    maxFileSizeMb: 15,
    mediaRetentionDays: 30,
    features: ['1000 Campaigns/day', '2500 Contacts', '500MB Storage', '30-Day Retention']
  },
  pro: {
    maxCampaignsPerDay: Infinity,
    maxContacts: Infinity,
    maxStorageMb: 5120, // 5GB
    maxFileSizeMb: 64,   // WhatsApp's global max is ~64MB
    mediaRetentionDays: 365,
    features: ['Unlimited Campaigns', 'Unlimited Contacts', '5GB Storage', '1-Year Retention']
  }
};
