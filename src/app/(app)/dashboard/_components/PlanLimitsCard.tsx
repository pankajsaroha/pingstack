'use client';

import { Zap, Book } from 'lucide-react';
import { PLANS, PlanType, getActivePlanType } from '@/lib/plans';

interface PlanLimitsCardProps {
  tenant: any;
  stats: {
    totalContacts: number;
  };
  onCancelSubscription: () => void;
}

export default function PlanLimitsCard({ tenant, stats, onCancelSubscription }: PlanLimitsCardProps) {
  const planType: PlanType = tenant?.plan_type || 'starter';
  const activePlan = PLANS[planType];
  const maxCampaigns = activePlan?.maxCampaignsPerDay;
  const maxContacts = activePlan?.maxContacts;
  const maxStorage = activePlan?.maxStorageMb;

  const campaignsUsed = tenant?.campaigns_sent_today || 0;
  const contactsUsed = stats.totalContacts || 0;
  const storageMbUsed = Math.round((tenant?.storage_usage_bytes || 0) / 1024 / 1024);

  const campaignPct = Math.min(100, (campaignsUsed / (maxCampaigns || 1)) * 100);
  const contactPct = Math.min(100, (contactsUsed / (maxContacts || 1)) * 100);
  const storagePct = Math.min(100, (storageMbUsed / (PLANS[getActivePlanType(tenant?.plan_type)].maxStorageMb || 1)) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      {/* Plan Limits */}
      <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h3 className="text-lg font-black text-fg flex items-center">
            <Zap className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
            Plan Limits &amp; Retainers
          </h3>
          <span className="self-start sm:self-auto px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
            {tenant?.plan_type || 'Starter'} Profile
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-fg/50">Campaigns Used Today</span>
              <span className="text-[10px] font-black text-fg/30 uppercase">
                {campaignsUsed} / {maxCampaigns === Infinity ? '∞' : maxCampaigns}
              </span>
            </div>
            <div className="h-1.5 w-full bg-glass-input rounded-full overflow-hidden border border-glass-border">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                style={{ width: `${campaignPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-fg/50">Total Managed Contacts</span>
              <span className="text-[10px] font-black text-fg/30 uppercase">
                {contactsUsed} / {maxContacts === Infinity ? '∞' : maxContacts}
              </span>
            </div>
            <div className="h-1.5 w-full bg-glass-input rounded-full overflow-hidden border border-glass-border">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                style={{ width: `${contactPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-fg/50">WABA Storage Usage</span>
              <span className="text-[10px] font-black text-fg/30 uppercase">
                {storageMbUsed} MB / {maxStorage} MB
              </span>
            </div>
            <div className="h-1.5 w-full bg-glass-input rounded-full overflow-hidden border border-glass-border">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-glass-border flex items-center justify-between">
          <a href="/pricing" className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-fg flex items-center uppercase tracking-widest transition-all">
            Upgrade subscription &rarr;
          </a>
          {tenant?.plan_type && getActivePlanType(tenant.plan_type) !== 'starter' && tenant.subscription_status === 'active' && (
            <button
              onClick={onCancelSubscription}
              className="text-[9px] font-black text-fg/20 hover:text-red-400 uppercase tracking-widest transition-colors cursor-pointer"
            >
              Cancel Sub
            </button>
          )}
        </div>
      </div>

      {/* API Guidebook */}
      <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-black text-fg mb-4 flex items-center">
            <Book className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
            API Guidebook
          </h3>
          <p className="text-muted text-sm font-semibold leading-relaxed">
            PingStack syncs templates in background. Reference endpoints or learn variables templates layouts implementation inside our developers portal docs.
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-glass-border">
          <a href="/docs" className="inline-flex items-center px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95">
            Developer Manuals
          </a>
        </div>
      </div>
    </div>
  );
}
