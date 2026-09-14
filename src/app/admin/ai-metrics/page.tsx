'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Layers,
  Cpu,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { AiTemplateMetricsData } from '@/lib/server/ai-metrics';

export default function AdminAiMetricsPage() {
  const [data, setData] = useState<AiTemplateMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/ai-metrics');
      if (res.ok) {
        const json = await res.json();
        setData(json.metrics);
      }
    } catch (err) {
      console.error('Failed to load AI template metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Aggregating AI template metrics & token telemetry...</span>
        </div>
      </div>
    );
  }

  const {
    overview = {
      totalRequests: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      validationFailures: 0,
      rateLimitedRequests: 0,
      quotaExhaustedRequests: 0,
      successRate: 100,
    },
    planBreakdown = { growth: 0, pro: 0, starterRejected: 0 },
    timeBreakdown = { today: 0, thisWeek: 0, thisMonth: 0 },
    performance = { avgLatencyMs: 0, p50LatencyMs: 0, p95LatencyMs: 0, openaiErrorsCount: 0, http429Count: 0, http5xxCount: 0 },
    quality = { totalSuggestionsGenerated: 0, validationSuccessRate: 100, invalidSchemaCount: 0 },
    cost = { model: 'gpt-4o-mini', totalTokens: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    recentGenerations = [],
  } = data || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>AI Assisted Templates Intelligence</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Usage analytics, token telemetry, latency benchmarks, schema validation quality, and financial economics for AI template generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : 'text-zinc-400'}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* ── 1. KPI TOP SUMMARY CARDS ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Generations */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Total Generations</span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overview.totalRequests}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{overview.successRate}% Success</span>
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/40">
            <span>{overview.successfulGenerations} successful</span>
            <span>{quality.totalSuggestionsGenerated} suggestions</span>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Latency Benchmarks</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{performance.avgLatencyMs}ms</span>
            <span className="text-xs text-zinc-400 font-mono">avg</span>
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/40 font-mono">
            <span>p50: {performance.p50LatencyMs}ms</span>
            <span>p95: {performance.p95LatencyMs}ms</span>
          </div>
        </div>

        {/* Token Usage & Cost */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Token & Cost Economics</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">${cost.estimatedCostUsd.toFixed(4)}</span>
            <span className="text-xs text-zinc-400 font-mono">est. cost</span>
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/40 font-mono">
            <span>{cost.totalTokens.toLocaleString()} tokens</span>
            <span>{cost.model}</span>
          </div>
        </div>

        {/* Rate Limits & Quotas */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Guardrails & Safety</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{quality.validationSuccessRate}%</span>
            <span className="text-xs text-zinc-500">Valid Schema</span>
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/40">
            <span>{overview.rateLimitedRequests} 429 rate-limited</span>
            <span>{overview.validationFailures} rejected</span>
          </div>
        </div>
      </div>

      {/* ── 2. BREAKDOWN MATRICES ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plan Distribution */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Plan Distribution
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Growth Plan (5/mo)</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{planBreakdown.growth}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Pro Plan (20/mo)</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{planBreakdown.pro}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="font-semibold text-zinc-500">Starter Gated Attempts</span>
              <span className="font-mono text-zinc-400">{planBreakdown.starterRejected}</span>
            </div>
          </div>
        </div>

        {/* Time Frequency */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Time Frequency
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Today</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{timeBreakdown.today}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Last 7 Days</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{timeBreakdown.thisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Last 30 Days</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{timeBreakdown.thisMonth}</span>
            </div>
          </div>
        </div>

        {/* Quality & Token Breakdown */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Token Breakdown
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="text-zinc-500">Input Tokens</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{cost.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="text-zinc-500">Output Tokens</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{cost.outputTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="text-zinc-500">Unit Price</span>
              <span className="text-emerald-500 font-bold">$0.15 / $0.60 per 1M</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. RECENT GENERATION AUDIT STREAM ─────────────────── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Recent AI Template Generations (Audit Stream)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Prompts strictly masked for tenant privacy</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 uppercase font-mono text-[10px] border-b border-zinc-200/60 dark:border-zinc-800/40">
              <tr>
                <th className="py-2.5 px-4">Workspace</th>
                <th className="py-2.5 px-4">Plan</th>
                <th className="py-2.5 px-4">Model</th>
                <th className="py-2.5 px-4">Latency</th>
                <th className="py-2.5 px-4">Tokens</th>
                <th className="py-2.5 px-4">Suggestions</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800/40 font-mono">
              {recentGenerations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 font-sans">
                    No recent AI template generations recorded yet.
                  </td>
                </tr>
              ) : (
                recentGenerations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                      {gen.tenantName || gen.tenantId.slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                        {gen.plan}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{gen.model}</td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{gen.latencyMs}ms</td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{gen.tokens}</td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{gen.suggestionsCount}</td>
                    <td className="py-2.5 px-4">
                      {gen.status === 'SUCCESS' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          <XCircle className="w-3 h-3" />
                          <span>{gen.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-400 text-[11px]">
                      {new Date(gen.timestamp).toLocaleString()}
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
