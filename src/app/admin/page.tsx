'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  MessageCircleQuestion,
  Activity,
  ChevronRight,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (!res.ok) {
        throw new Error(`Failed to load overview (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Loading platform metrics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 dark:text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Unable to load command center</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400/80">{error}</p>
        <button
          onClick={() => fetchOverview(true)}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-800 text-white border border-zinc-700 rounded-lg text-xs font-semibold hover:bg-zinc-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { metrics, throughput7d, recentBusinesses, recentFeedback } = data;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span>{getGreeting()}, Founder</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Platform performance, business health, and messaging analytics across Pingstack.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            Updated {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : 'text-zinc-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Level Metric Grid (8 Analytical KPI Cards) */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold mb-3">
          Platform Overview
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Businesses */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Total Businesses</span>
              <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalBusinesses.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics.activeBusinesses}</span> active
            </div>
          </div>

          {/* WhatsApp Connected */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>WhatsApp Connected</span>
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
              {metrics.whatsappConnected.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {metrics.totalBusinesses > 0
                ? Math.round((metrics.whatsappConnected / metrics.totalBusinesses) * 100)
                : 0}
              % connection rate
            </div>
          </div>

          {/* Onboarding Incomplete */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Onboarding Incomplete</span>
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-300">
              {metrics.onboardingIncomplete.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              Needs WA connection
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Active Campaigns</span>
              <Megaphone className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
              {metrics.activeCampaigns}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              Running / scheduled
            </div>
          </div>

          {/* Messages Today */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Messages Today</span>
              <Radio className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
              {metrics.messagesToday.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono flex items-center gap-1">
              {metrics.messagesTodayChange >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +{metrics.messagesTodayChange}%
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> {metrics.messagesTodayChange}%
                </span>
              )}
              <span className="text-zinc-400 dark:text-zinc-500">vs yesterday</span>
            </div>
          </div>

          {/* Delivered Today */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Delivered Today</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
              {metrics.messagesDeliveredToday.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              {metrics.deliveryRateToday}% delivery rate
            </div>
          </div>

          {/* Failed Today */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Failed Today</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {metrics.messagesFailedToday.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {metrics.messagesFailedTodayChange > 0 ? `+${metrics.messagesFailedTodayChange}%` : `${metrics.messagesFailedTodayChange}%`} vs yesterday
            </div>
          </div>

          {/* Platform Status */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>System Health</span>
              <Activity className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5" />
              <span>Operational</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              All services healthy
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Message Activity Sparkline Chart */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">7-Day Message Throughput</h3>
            <p className="text-xs text-zinc-500">Platform-wide daily outbound and delivery volumes</p>
          </div>
          <Link
            href="/admin/messages"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Detailed Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Minimal Bar Chart */}
        <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
          {throughput7d.map((d: any) => {
            const maxSent = Math.max(...throughput7d.map((x: any) => x.sent), 10);
            const heightPct = Math.max(8, Math.round((d.sent / maxSent) * 100));

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="text-[10px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.sent}
                </div>
                <div className="w-full max-w-[48px] bg-zinc-100 dark:bg-zinc-800/80 rounded-t-md relative overflow-hidden flex flex-col justify-end" style={{ height: `${heightPct}%` }}>
                  <div
                    className="w-full bg-indigo-500 dark:bg-indigo-500/80 rounded-t-md group-hover:bg-indigo-600 dark:group-hover:bg-indigo-400 transition-all"
                    style={{ height: '100%' }}
                  />
                </div>
                <div className="text-[11px] font-mono text-zinc-500 truncate">{d.date}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
              <span>Total Messages</span>
            </span>
          </div>
          <span>Updated continuously</span>
        </div>
      </div>

      {/* Two Column Section: Recent Businesses & Quick Health / Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Businesses Table (2 Columns) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Recent Businesses</h3>
              <p className="text-xs text-zinc-500">Latest organizations registered on Pingstack</p>
            </div>
            <Link
              href="/admin/businesses"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">
                  <th className="py-2.5 font-medium">Business</th>
                  <th className="py-2.5 font-medium">Owner</th>
                  <th className="py-2.5 font-medium">Plan</th>
                  <th className="py-2.5 font-medium">WhatsApp</th>
                  <th className="py-2.5 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                {recentBusinesses.map((b: any) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="py-3">
                      <Link href={`/admin/businesses/${b.id}`} className="font-semibold text-zinc-900 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5">
                        <span>{b.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                      </Link>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{b.public_id || b.id}</span>
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] truncate max-w-[140px]">
                      {b.ownerEmail}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded ${
                        b.plan_type === 'growth'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : b.plan_type === 'pro'
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50'
                      }`}>
                        {b.plan_type || 'starter'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] ${
                        b.whatsappStatus === 'Connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.whatsappStatus === 'Connected' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                        {b.whatsappStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right text-zinc-500 font-mono text-[11px]">
                      {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Feedback & Quick Links */}
        <div className="space-y-6">
          {/* Recent Feedback Card */}
          <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Customer Feedback</h3>
              </div>
              <Link href="/admin/feedback" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View
              </Link>
            </div>

            {recentFeedback.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No feedback received yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentFeedback.map((f: any) => (
                  <div key={f.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        {f.type}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 line-clamp-2 text-[11px] leading-relaxed">
                      {f.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Platform Navigation Links */}
          <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
              Quick Operations
            </h4>
            <div className="space-y-1.5 text-xs font-medium">
              <Link
                href="/admin/analytics"
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <span>Inspect Onboarding Funnel</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </Link>
              <Link
                href="/admin/subscriptions"
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <span>Subscription & MRR Breakdown</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </Link>
              <Link
                href="/admin/system"
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <span>WhatsApp Cloud API Errors</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
