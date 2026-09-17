'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Download, 
  Loader2, 
  TrendingUp, 
  CheckCircle2, 
  Eye, 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  FileText,
  Activity,
  Send,
  CornerDownRight,
  ShieldCheck,
  Users,
  Layers,
  UserCheck,
  Filter
} from 'lucide-react';

interface AdvancedAnalyticsViewProps {
  tenant: any;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type RangeOption = 'today' | '7d' | '30d' | '90d' | 'custom';

export default function AdvancedAnalyticsView({ tenant, onToast }: AdvancedAnalyticsViewProps) {
  const [range, setRange] = useState<RangeOption>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const isPro = tenant?.plan_type === 'pro';

  const fetchAnalytics = useCallback(async (selectedRange: RangeOption, teamId?: string, start?: string, end?: string) => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      let queryUrl = `/api/analytics/advanced?range=${selectedRange}`;
      if (teamId && teamId !== 'all') {
        queryUrl += `&teamId=${encodeURIComponent(teamId)}`;
      }
      if (selectedRange === 'custom' && start) {
        queryUrl += `&startDate=${encodeURIComponent(start)}`;
        if (end) queryUrl += `&endDate=${encodeURIComponent(end)}`;
      }

      const res = await fetch(queryUrl, {
        headers: { 'x-tenant-id': tenant.id }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 403) {
        setData(null);
      }
    } catch (e) {
      console.error('Failed to fetch advanced analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (isPro) {
      if (range === 'custom') {
        if (customStart) fetchAnalytics(range, selectedTeamId, customStart, customEnd);
      } else {
        fetchAnalytics(range, selectedTeamId);
      }
    } else {
      setLoading(false);
    }
  }, [isPro, range, selectedTeamId, customStart, customEnd, fetchAnalytics]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let exportUrl = `/api/analytics/advanced?range=${range}&export=csv`;
      if (selectedTeamId !== 'all') {
        exportUrl += `&teamId=${encodeURIComponent(selectedTeamId)}`;
      }
      if (range === 'custom' && customStart) {
        exportUrl += `&startDate=${encodeURIComponent(customStart)}`;
        if (customEnd) exportUrl += `&endDate=${encodeURIComponent(customEnd)}`;
      }

      const res = await fetch(exportUrl, {
        headers: { 'x-tenant-id': tenant.id }
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pingstack_analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onToast('Analytics CSV report exported successfully!', 'success');
    } catch (e: any) {
      onToast(e.message || 'Export error', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Gated View for Starter & Growth
  if (!isPro) {
    return (
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-8 rounded-2xl shadow-2xs text-center max-w-2xl mx-auto space-y-6">
        <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Pro Advanced Analytics</h3>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-bold uppercase">
              PRO
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Gain deep visibility into multi-day delivery funnels, team assignment metrics, response speeds, peak messaging activity by hour, and member performance.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">Teams &amp; Member Analytics</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Track department conversation distribution, unassigned queues, and member response metrics.</p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">Failure Diagnostics</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Deterministic breakdown of Meta Cloud API error codes with actionable troubleshooting tips.</p>
          </div>
        </div>
      </div>
    );
  }

  const totals = data?.totals || {
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    inbound: 0,
    deliveryRate: 0,
    readRate: 0,
    failureRate: 0,
    responseRate: 0
  };

  const responseMetrics = data?.responseMetrics || {
    activeConversations: 0,
    unansweredConversations: 0,
    averageResponseMinutes: null,
    medianResponseMinutes: null,
    firstResponseMinutes: null
  };

  const teamOverview = data?.teamOverview || {
    activeTeamsCount: 0,
    activeMembersCount: 0,
    totalConversationsInPeriod: 0,
    assignedConversationsCount: 0,
    unassignedConversationsCount: 0,
    assignmentRate: 0
  };

  const availableTeams = data?.teams || [];
  const conversationsByTeam = data?.conversationsByTeam || [];
  const teamMessageActivity = data?.teamMessageActivity || [];
  const teamResponsePerformance = data?.teamResponsePerformance || [];
  const memberActivity = data?.memberActivity || [];

  const timeSeries = data?.timeSeries || [];
  const hourly = data?.hourlyDistribution || [];
  const topFailureReasons = data?.topFailureReasons || [];
  const templatePerformance = data?.templatePerformance || [];
  const campaignComparison = data?.campaignComparison || [];
  const timezone = data?.timezone || tenant?.timezone || 'Asia/Kolkata';

  const hasActivity = totals.sent > 0 || totals.inbound > 0;
  const hasTeamsData = availableTeams.length > 0 || conversationsByTeam.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Controls Toolbar */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Pro Advanced Analytics
            </h3>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-bold uppercase">
              PRO
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Workspace timezone: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{timezone}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Team Filter */}
          {availableTeams.length > 0 && (
            <div className="relative">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none"
              >
                <option value="all">All Teams</option>
                {availableTeams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range picker */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs font-semibold">
            {(['today', '7d', '30d', '90d', 'custom'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  range === r 
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            disabled={exporting || loading}
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-indigo-500" />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Selectors */}
      {range === 'custom' && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics('custom', selectedTeamId, customStart, customEnd)}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
          >
            Apply Range
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-500 mb-2.5" />
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Aggregating workspace messaging metrics...</p>
        </div>
      ) : !hasActivity && !hasTeamsData ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
          <Activity className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">No Message Activity in Selected Period</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            No outbound messages or inbound replies were recorded for this workspace within the selected date range.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 text-left">
            <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Dispatched</span>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{totals.sent.toLocaleString()}</p>
              <span className="text-[10px] text-zinc-500 font-medium block mt-1">Outbound sent</span>
            </div>

            <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Delivered</span>
              <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{totals.delivered.toLocaleString()}</p>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium block mt-1">{totals.deliveryRate}% Delivery rate</span>
            </div>

            <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">Read / Opened</span>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{totals.read.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium block mt-1">{totals.readRate}% Read rate</span>
            </div>

            <div className="p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">Failed</span>
              <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{totals.failed.toLocaleString()}</p>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium block mt-1">{totals.failureRate}% Failure rate</span>
            </div>

            <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-xl shadow-2xs col-span-2 lg:col-span-1">
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">Inbound Replies</span>
              <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">{totals.inbound.toLocaleString()}</p>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-medium block mt-1">{totals.responseRate}% Response ratio</span>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TEAMS & MEMBERS PERFORMANCE SECTION                           */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Teams &amp; Workspace Members Performance
              </h4>
            </div>

            {/* High-Level Team Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3.5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Active Teams</span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{teamOverview.activeTeamsCount}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">{teamOverview.activeMembersCount} team members</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Assigned Chats</span>
                <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{teamOverview.assignedConversationsCount}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">{teamOverview.assignmentRate}% assignment rate</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">Unassigned Queue</span>
                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{teamOverview.unassignedConversationsCount}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Awaiting team routing</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Total Active Chats</span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{teamOverview.totalConversationsInPeriod}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">In selected period</span>
              </div>
            </div>

            {/* Conversations by Team Horizontal Distribution */}
            {conversationsByTeam.length > 0 && (
              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Conversations by Team
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-400">Share of active conversations</span>
                </div>

                <div className="space-y-2.5">
                  {conversationsByTeam.map((team: any) => (
                    <div key={team.teamId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: team.color || '#4F46E5' }} 
                          />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{team.teamName}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-zinc-500">
                          <span>{team.count} chats</span>
                          <span className="font-bold text-zinc-900 dark:text-white">{team.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.max(2, team.percentage)}%`, 
                            backgroundColor: team.color || '#4F46E5' 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Message Activity & Delivery */}
            {teamMessageActivity.length > 0 && (
              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Message Activity &amp; Delivery by Team
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-400">Attributed to assigned department</span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        <th className="pb-2.5 px-3">Team</th>
                        <th className="pb-2.5 px-3 text-center">Inbound</th>
                        <th className="pb-2.5 px-3 text-center">Outbound</th>
                        <th className="pb-2.5 px-3 text-center">Total</th>
                        <th className="pb-2.5 px-3 text-center">Delivered</th>
                        <th className="pb-2.5 px-3 text-center">Delivery Rate</th>
                        <th className="pb-2.5 px-3 text-right">Read Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                      {teamMessageActivity.map((t: any) => (
                        <tr key={t.teamId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#4F46E5' }} />
                            <span>{t.teamName}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-purple-600 dark:text-purple-400">{t.inbound}</td>
                          <td className="py-3 px-3 text-center font-mono">{t.outbound}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-900 dark:text-white">{t.total}</td>
                          <td className="py-3 px-3 text-center font-mono text-blue-600 dark:text-blue-400">{t.delivered}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{t.deliveryRate}%</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{t.readRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Member Activity Table */}
            {memberActivity.length > 0 && (
              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      Workspace Member Activity
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Operational workload and reply metrics per workspace member
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        <th className="pb-2.5 px-3">Member</th>
                        <th className="pb-2.5 px-3">Teams</th>
                        <th className="pb-2.5 px-3 text-center">Assigned Chats</th>
                        <th className="pb-2.5 px-3 text-center">Responses Sent</th>
                        <th className="pb-2.5 px-3 text-center">Median Reply Speed</th>
                        <th className="pb-2.5 px-3 text-right">Unanswered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                      {memberActivity.map((m: any) => (
                        <tr key={m.userId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-zinc-900 dark:text-white">{m.name}</div>
                            <div className="text-[10px] font-mono text-zinc-400">{m.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {m.teamNames.map((tn: string) => (
                                <span key={tn} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                                  {tn}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{m.assignedConversations}</td>
                          <td className="py-3 px-3 text-center font-mono">{m.outboundReplies}</td>
                          <td className="py-3 px-3 text-center font-mono">
                            {m.medianResponseMinutes !== null ? `${m.medianResponseMinutes} min` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            {m.unansweredCount > 0 ? (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded font-bold">
                                {m.unansweredCount}
                              </span>
                            ) : (
                              <span className="text-zinc-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Conversation & Response Time Health Card */}
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Conversation &amp; Response Speed Overview
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">Workspace Level</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Active Threads</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{responseMetrics.activeConversations}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">With message activity</span>
              </div>

              <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-900/30">
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">Unanswered</span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{responseMetrics.unansweredConversations}</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Awaiting agent reply</span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Avg Response</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                  {responseMetrics.averageResponseMinutes !== null ? `${responseMetrics.averageResponseMinutes} min` : '—'}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Mean reply duration</span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Median Response</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                  {responseMetrics.medianResponseMinutes !== null ? `${responseMetrics.medianResponseMinutes} min` : '—'}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">50th percentile</span>
              </div>
            </div>
          </div>

          {/* Time-Series Trend */}
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Daily Messaging Activity
              </h4>
              <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Delivered</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Read</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Failed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-500" /> Inbound</span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[600px] flex items-end gap-2 h-44 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                {timeSeries.map((row: any) => {
                  const maxVal = Math.max(...timeSeries.map((t: any) => t.sent + t.inbound), 10);
                  const delHeight = (row.delivered / maxVal) * 100;
                  const readHeight = (row.read / maxVal) * 100;
                  const failHeight = (row.failed / maxVal) * 100;
                  const inbHeight = (row.inbound / maxVal) * 100;

                  return (
                    <div key={row.date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        {row.delivered > 0 && <div style={{ height: `${Math.max(6, delHeight)}%` }} className="w-full bg-blue-500/80 rounded-t-sm" />}
                        {row.read > 0 && <div style={{ height: `${Math.max(6, readHeight)}%` }} className="w-full bg-emerald-500/80 rounded-t-sm" />}
                        {row.failed > 0 && <div style={{ height: `${Math.max(6, failHeight)}%` }} className="w-full bg-rose-500/80 rounded-t-sm" />}
                        {row.inbound > 0 && <div style={{ height: `${Math.max(6, inbHeight)}%` }} className="w-full bg-purple-500/80 rounded-t-sm" />}
                        {row.sent === 0 && row.inbound === 0 && (
                          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                        {row.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Peak Messaging Activity by Hour */}
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Message Activity by Hour
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Hourly traffic breakdown in workspace timezone ({timezone})
                </p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[650px] flex items-end gap-1.5 h-36 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                {hourly.map((h: any) => {
                  const maxH = Math.max(...hourly.map((item: any) => item.count), 1);
                  const hHeight = (h.count / maxH) * 100;

                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex items-end justify-center h-24">
                        <div 
                          style={{ height: h.count > 0 ? `${Math.max(8, hHeight)}%` : '2px' }} 
                          className={`w-full rounded-t-sm transition-all ${
                            h.count > 0 
                              ? 'bg-indigo-500 group-hover:bg-indigo-400' 
                              : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">
                        {h.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Failure Reasons & Troubleshooting */}
          {topFailureReasons.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Top Message Failure Reasons
                </h4>
              </div>

              <div className="space-y-2.5">
                {topFailureReasons.map((f: any) => {
                  const isExpanded = expandedError === f.code;
                  return (
                    <div 
                      key={f.code} 
                      className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-800/30"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedError(isExpanded ? null : f.code)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded font-mono text-[10px] font-bold">
                            {f.code}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{f.title}</span>
                            <span className="text-[11px] text-zinc-400 block font-mono">
                              {f.count.toLocaleString()} failures ({f.percentage}%)
                            </span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 pt-0 text-xs border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900/60">
                          <div>
                            <strong className="text-zinc-800 dark:text-zinc-200 block text-[11px]">Explanation:</strong>
                            <p className="mt-0.5">{f.explanation}</p>
                          </div>
                          <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 rounded-lg text-indigo-900 dark:text-indigo-300">
                            <strong className="block text-[11px] font-bold">Recommended Action:</strong>
                            <p className="mt-0.5 text-[11px]">{f.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Template Performance Table */}
          {templatePerformance.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Template Performance
                </h4>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      <th className="pb-2.5 px-3">Template</th>
                      <th className="pb-2.5 px-3 text-center">Dispatched</th>
                      <th className="pb-2.5 px-3 text-center">Delivered</th>
                      <th className="pb-2.5 px-3 text-center">Read</th>
                      <th className="pb-2.5 px-3 text-center">Delivery Rate</th>
                      <th className="pb-2.5 px-3 text-right">Read Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {templatePerformance.map((t: any) => (
                      <tr key={t.templateName} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">{t.templateName}</td>
                        <td className="py-3 px-3 text-center font-mono">{t.sent}</td>
                        <td className="py-3 px-3 text-center font-mono text-blue-600 dark:text-blue-400">{t.delivered}</td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{t.read}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{t.deliveryRate}%</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{t.readRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaign Comparison Table */}
          {campaignComparison.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Campaign Broadcast Performance
                </h4>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      <th className="pb-2.5 px-3">Campaign</th>
                      <th className="pb-2.5 px-3">Date</th>
                      <th className="pb-2.5 px-3 text-center">Sent</th>
                      <th className="pb-2.5 px-3 text-center">Delivered</th>
                      <th className="pb-2.5 px-3 text-center">Read</th>
                      <th className="pb-2.5 px-3 text-center">Delivery Rate</th>
                      <th className="pb-2.5 px-3 text-right">Read Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {campaignComparison.map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">{c.name}</td>
                        <td className="py-3 px-3 font-mono text-zinc-400 text-[11px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-center font-mono">{c.sent}</td>
                        <td className="py-3 px-3 text-center font-mono text-blue-600 dark:text-blue-400">{c.delivered}</td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{c.read}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{c.deliveryRate}%</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{c.readRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
