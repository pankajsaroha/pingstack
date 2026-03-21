export type PlanType = 'starter' | 'growth' | 'pro';

export interface PlanLimits {
  maxCampaignsPerDay: number;
  maxContacts: number;
  features: string[];
}

export const PLANS: Record<PlanType, PlanLimits> = {
  starter: {
    maxCampaignsPerDay: 2,
    maxContacts: 500,
    features: ['All core features']
  },
  growth: {
    maxCampaignsPerDay: Infinity,
    maxContacts: 5000,
    features: ['Unlimited campaigns', '5000 contacts', 'Advanced automation']
  },
  pro: {
    maxCampaignsPerDay: Infinity,
    maxContacts: Infinity,
    features: ['Unlimited everything', 'Team members', 'Priority support']
  }
};
