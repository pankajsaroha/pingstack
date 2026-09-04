'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Clock,
  Sparkles,
  Building2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<'new' | 'activated' | 'atRisk' | 'inactive'>('activated');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Computing onboarding funnels & cohorts...</span>
        </div>
      </div>
    );
  }

  const { funnel, segments, insights } = data || {
    funnel: [],
    segments: { new: { count: 0, items: [] }, activated: { count: 0, items: [] }, atRisk: { count: 0, items: [] }, inactive: { count: 0, items: [] } },
    insights: { topBusinesses: [], avgSignupToWaHours: 0, avgWaToFirstMsgHours: 0, avgMessagesPerActiveBusiness: 0, templateDistribution: { approvalRate: 0 } },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <span>Product Analytics & Onboarding Funnel</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Track customer activation journey, drop-off points, transparent risk cohorts, and platform milestones.
        </p>
      </div>

      {/* ── 1. ONBOARDING FUNNEL ────────────────────────────────────────── */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Full Onboarding Funnel</h3>
            <p className="text-xs text-zinc-500">
              Conversion rate through every critical customer setup milestone
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">
            Platform Baseline: {funnel[0]?.count || 0} Registrations
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {funnel.map((step: any) => {
            return (
              <div key={step.step} className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-lg space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                      {step.step}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-200">{step.name}</span>
                    <span className="text-[11px] text-zinc-500 hidden md:inline">— {step.description}</span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px] self-end sm:self-auto">
                    <span className="text-zinc-800 dark:text-zinc-200 font-bold">{step.count} businesses</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{step.percentageOfTotal}% of total</span>
                    {step.step > 1 && (
                      <span className="text-rose-600 dark:text-rose-400/90 text-[10px]">
                        ↓ {step.dropoff}% drop
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, step.percentageOfTotal)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. ACTIVATION COHORTS & SEGMENTS ──────────────────────────────── */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Business Activation Segments</h3>
            <p className="text-xs text-zinc-500">Transparent rule-based customer grouping</p>
          </div>

          {/* Segment Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
            <button
              onClick={() => setActiveSegment('activated')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSegment === 'activated'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Activated ({segments.activated.count})
            </button>
            <button
              onClick={() => setActiveSegment('new')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSegment === 'new'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              New &lt; 7d ({segments.new.count})
            </button>
            <button
              onClick={() => setActiveSegment('atRisk')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSegment === 'atRisk'
                  ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              At Risk ({segments.atRisk.count})
            </button>
            <button
              onClick={() => setActiveSegment('inactive')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeSegment === 'inactive'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-300 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Inactive ({segments.inactive.count})
            </button>
          </div>
        </div>

        {/* Selected Cohort Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-mono text-[11px]">
                <th className="py-2.5 font-medium">Business</th>
                <th className="py-2.5 font-medium">Plan</th>
                <th className="py-2.5 font-medium">WhatsApp</th>
                <th className="py-2.5 font-medium text-right">Messages Sent</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {segments[activeSegment].items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No businesses in this cohort currently.
                  </td>
                </tr>
              ) : (
                segments[activeSegment].items.map((b: any) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">
                      <Link href={`/admin/businesses/${b.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                        {b.name}
                      </Link>
                      {b.riskReason && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400/90 font-mono">{b.riskReason}</div>
                      )}
                      {b.inactiveReason && (
                        <div className="text-[10px] text-zinc-500 font-mono">{b.inactiveReason}</div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400">
                        {b.planType}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[11px] ${
                          b.whatsappStatus === 'Connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        {b.whatsappStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-zinc-800 dark:text-zinc-200">
                      {b.totalMessages.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. PRODUCT INSIGHTS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Speed to Value Card */}
        <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Speed to Value</h3>
          </div>
          <div className="space-y-3 text-xs pt-1">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500 dark:text-zinc-400">Avg. Signup → WA Connected</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{insights.avgSignupToWaHours} hrs</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500 dark:text-zinc-400">Avg. WA Connected → First Message</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{insights.avgWaToFirstMsgHours} hrs</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 dark:text-zinc-400">Avg. Messages per Active Biz</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{insights.avgMessagesPerActiveBusiness}</span>
            </div>
          </div>
        </div>

        {/* Template Health Card */}
        <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Template Approval Health</h3>
          </div>
          <div className="space-y-3 text-xs pt-1">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500 dark:text-zinc-400">Meta Approval Rate</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {insights.templateDistribution?.approvalRate}%
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500 dark:text-zinc-400">Approved Templates</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-200">{insights.templateDistribution?.approved}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 dark:text-zinc-400">Pending / In Review</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">{insights.templateDistribution?.pending}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Businesses by Usage */}
        <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Top Businesses by Volume</h3>
          </div>
          <div className="space-y-2 text-xs pt-1">
            {insights.topBusinesses.map((b: any, idx: number) => (
              <div key={b.id} className="flex items-center justify-between py-1">
                <Link
                  href={`/admin/businesses/${b.id}`}
                  className="font-medium text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[160px]"
                >
                  {idx + 1}. {b.name}
                </Link>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-200">{b.messagesSent.toLocaleString()} msgs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
