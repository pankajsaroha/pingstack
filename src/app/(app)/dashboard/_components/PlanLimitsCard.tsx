'use client';

import Link from 'next/link';
import { Zap, Book, ArrowRight } from 'lucide-react';
import { PLANS, PlanType, getActivePlanType } from '@/lib/plans';

interface TenantLimitsData {
  plan_type?: string | null;
  subscription_status?: string | null;
  campaigns_sent_today?: number | null;
  storage_usage_bytes?: number | null;
  [key: string]: unknown;
}

interface PlanLimitsCardProps {
  tenant: TenantLimitsData | null;
  stats: {
    totalContacts: number;
  };
  onCancelSubscription: () => void;
}

export default function PlanLimitsCard({ tenant, stats, onCancelSubscription }: PlanLimitsCardProps) {
  const planType: PlanType = getActivePlanType(tenant?.plan_type);
  const activePlan = PLANS[planType];
  const maxCampaigns = activePlan?.maxCampaignsPerDay;
  const maxContacts = activePlan?.maxContacts;
  const maxStorage = activePlan?.maxStorageMb;

  const campaignsUsed = tenant?.campaigns_sent_today || 0;
  const contactsUsed = stats.totalContacts || 0;
  const storageMbUsed = Math.round((tenant?.storage_usage_bytes || 0) / 1024 / 1024);

  const campaignPct = Math.min(100, (campaignsUsed / (maxCampaigns || 1)) * 100);
  const contactPct = Math.min(100, (contactsUsed / (maxContacts || 1)) * 100);
  const storagePct = Math.min(100, (storageMbUsed / (activePlan?.maxStorageMb || 1)) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      {/* Plan Limits Card */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Plan Limits &amp; Quotas
            </h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {tenant?.plan_type ? String(tenant.plan_type) : 'Starter'} Plan
          </span>
        </div>

        <div className="space-y-3.5 pt-1">
          {/* Template Sends */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Template Sends Today</span>
              <span className="font-mono text-zinc-500 text-[11px]">
                {campaignsUsed} / {maxCampaigns === Infinity ? '∞' : maxCampaigns}
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${campaignPct}%` }}
              />
            </div>
          </div>

          {/* Managed Contacts */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Managed Contacts</span>
              <span className="font-mono text-zinc-500 text-[11px]">
                {contactsUsed} / {maxContacts === Infinity ? '∞' : maxContacts}
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${contactPct}%` }}
              />
            </div>
          </div>

          {/* Storage Usage */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">WABA Storage</span>
              <span className="font-mono text-zinc-500 text-[11px]">
                {storageMbUsed} MB / {maxStorage} MB
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <Link 
            href="/pricing" 
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <span>Upgrade Subscription</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {tenant?.plan_type && getActivePlanType(String(tenant.plan_type)) !== 'starter' && tenant.subscription_status === 'active' && (
            <button
              onClick={onCancelSubscription}
              className="text-[10px] font-mono text-zinc-400 hover:text-rose-500 uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel Sub
            </button>
          )}
        </div>
      </div>

      {/* Developer API & Webhook Specs Card */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Book className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              API Specs &amp; Integrations
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Integrate custom inbound webhooks, generate workspace API tokens, and dispatch bulk message payloads via REST API endpoints.
          </p>
        </div>

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <Link 
            href="/docs" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <span>Open Developer Docs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[10px] font-mono text-zinc-400">Meta API v19.0</span>
        </div>
      </div>
    </div>
  );
}
