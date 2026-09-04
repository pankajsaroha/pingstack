'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Calculating subscription revenue metrics...</span>
        </div>
      </div>
    );
  }

  const { metrics, planBreakdown, recentPlanChanges } = data || {
    metrics: { totalBusinesses: 0, activeSubscriptions: 0, suspendedCount: 0, estimatedMrr: 0, estimatedArr: 0, starterCount: 0, growthCount: 0, proCount: 0 },
    planBreakdown: [],
    recentPlanChanges: [],
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <span>Subscription & Revenue Overview</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Plan tier distribution, transparent recurring revenue estimation, and admin plan update history.
        </p>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Subscriptions</div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {metrics.totalBusinesses.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">{metrics.activeSubscriptions} active accounts</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Estimated MRR</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">Estimated</span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            ₹{metrics.estimatedMrr.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">From active tier configs</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Estimated ARR</div>
          <div className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
            ₹{metrics.estimatedArr.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">Annualized run rate</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Suspended Accounts</div>
          <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {metrics.suspendedCount}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">Manually suspended</div>
        </div>
      </div>

      {/* Plan Breakdown Section */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Plan Distribution</h3>
          <p className="text-xs text-zinc-500">Customer distribution and revenue generation by plan tier</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planBreakdown.map((p: any) => (
            <div
              key={p.plan}
              className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                  {p.plan}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">{p.count} accounts</span>
              </div>

              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {p.monthlyRevenue > 0 ? `₹${p.monthlyRevenue.toLocaleString()} / mo` : '₹0 / mo'}
                </div>
                <div className="text-[11px] text-zinc-500">{p.price}</div>
              </div>

              {/* Share bar */}
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mb-1">
                  <span>Share of Platform</span>
                  <span>{p.percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-850 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.max(4, p.percentage)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Change Audit Trail */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden p-5 space-y-3 shadow-2xs">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Recent Plan Upgrades & Modifications</h3>
          <p className="text-xs text-zinc-500">Chronological history of plan overrides performed by Admin</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-mono text-[11px]">
                <th className="py-2.5 font-medium">Business</th>
                <th className="py-2.5 font-medium">Change</th>
                <th className="py-2.5 font-medium">Admin</th>
                <th className="py-2.5 font-medium">Internal Note</th>
                <th className="py-2.5 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {recentPlanChanges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No manual plan changes recorded in audit logs yet.
                  </td>
                </tr>
              ) : (
                recentPlanChanges.map((log: any) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">
                      <Link href={`/admin/businesses/${log.businessId}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                        {log.businessName}
                      </Link>
                    </td>
                    <td className="py-3 font-mono text-xs">
                      <span className="uppercase text-zinc-500 dark:text-zinc-400">{log.previousPlan}</span>
                      <span className="text-zinc-400 dark:text-zinc-600 mx-1.5">→</span>
                      <span className="uppercase font-bold text-indigo-600 dark:text-indigo-400">{log.newPlan}</span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">{log.adminEmail}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400 text-[11px] max-w-xs truncate">
                      {log.note || '—'}
                    </td>
                    <td className="py-3 text-right font-mono text-zinc-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
