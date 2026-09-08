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
  ArrowUpRight
} from 'lucide-react';

interface AdvancedAnalyticsViewProps {
  tenant: any;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function AdvancedAnalyticsView({ tenant, onToast }: AdvancedAnalyticsViewProps) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isPro = tenant?.plan_type === 'pro';

  const fetchAnalytics = useCallback(async (selectedRange: string) => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/advanced?range=${selectedRange}`, {
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
      fetchAnalytics(range);
    } else {
      setLoading(false);
    }
  }, [isPro, range, fetchAnalytics]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/analytics/advanced?range=${range}&export=csv`, {
        headers: { 'x-tenant-id': tenant.id }
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pingstack_advanced_analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onToast('Analytics CSV exported successfully!', 'success');
    } catch (e: any) {
      onToast(e.message || 'Export error', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Gated View for Starter & Growth
  if (!isPro) {
    return (
      <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/5">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-black text-fg tracking-tight">Advanced Analytics &amp; Reporting</h3>
            <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-black uppercase">
              PRO
            </span>
          </div>
          <p className="text-sm text-muted font-semibold leading-relaxed">
            Gain deep visibility into multi-day delivery trends, campaign performance comparisons, hourly peak activity, and 2-way conversation analytics.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-4 bg-glass-input/30 border border-glass-border rounded-2xl">
            <span className="text-[10px] font-black uppercase text-fg/70 block mb-1">Time-Series Trends</span>
            <p className="text-xs text-muted">Daily breakdown of sent, delivered, read, failed, and inbound customer responses.</p>
          </div>
          <div className="p-4 bg-glass-input/30 border border-glass-border rounded-2xl">
            <span className="text-[10px] font-black uppercase text-fg/70 block mb-1">Campaign Performance</span>
            <p className="text-xs text-muted">Compare delivery rates and open rates across all broadcasts in your workspace.</p>
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
    responseRate: 0
  };

  const timeSeries = data?.timeSeries || [];
  const campaignComparison = data?.campaignComparison || [];
  const hourly = data?.hourlyDistribution || {};

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Controls Toolbar */}
      <div className="bg-glass-card border border-glass-border p-6 rounded-[2.5rem] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-fg tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Pro Advanced Analytics
          </h3>
          <p className="text-xs text-muted font-semibold mt-0.5">
            Real-time delivery performance, hourly engagement, and broadcast metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Date range picker */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 border border-glass-border rounded-xl">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === r ? 'bg-fg text-bg shadow-sm' : 'text-muted hover:text-fg'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            disabled={exporting || loading}
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-glass-input hover:bg-white/10 border border-glass-border text-fg rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-indigo-400" />}
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 opacity-40">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-fg mb-3" />
          <p className="text-xs font-black uppercase tracking-widest">Aggregating messaging analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-5 bg-glass-card border border-glass-border rounded-2xl shadow-lg">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider block mb-1">Total Dispatched</span>
              <p className="text-2xl font-bold font-mono text-fg">{totals.sent.toLocaleString()}</p>
              <span className="text-[10px] text-muted font-semibold block mt-1">Outbound templates</span>
            </div>

            <div className="p-5 bg-blue-50/10 border border-blue-500/20 rounded-2xl shadow-lg">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block mb-1">Delivered</span>
              <p className="text-2xl font-bold font-mono text-blue-400">{totals.delivered.toLocaleString()}</p>
              <span className="text-[10px] text-blue-400/80 font-semibold block mt-1">{totals.deliveryRate}% Delivery rate</span>
            </div>

            <div className="p-5 bg-emerald-50/10 border border-emerald-500/20 rounded-2xl shadow-lg">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">Read / Opened</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">{totals.read.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-400/80 font-semibold block mt-1">{totals.readRate}% Read rate</span>
            </div>

            <div className="p-5 bg-purple-50/10 border border-purple-500/20 rounded-2xl shadow-lg">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block mb-1">Inbound Replies</span>
              <p className="text-2xl font-bold font-mono text-purple-400">{totals.inbound.toLocaleString()}</p>
              <span className="text-[10px] text-purple-400/80 font-semibold block mt-1">{totals.responseRate}% Response ratio</span>
            </div>
          </div>

          {/* Time-Series Trend */}
          <div className="bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl p-8 text-left space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-fg/30 uppercase tracking-widest px-1">Daily Message Activity</h4>
              <div className="flex items-center gap-4 text-[10px] font-bold text-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Delivered</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Read</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Failed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-500" /> Inbound</span>
              </div>
            </div>

            {timeSeries.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center italic">No messages recorded in selected date range.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[500px] flex items-end gap-2 h-44 pt-6 pb-2">
                  {timeSeries.map((row: any) => {
                    const maxVal = Math.max(...timeSeries.map((t: any) => t.sent + t.inbound), 10);
                    const delHeight = (row.delivered / maxVal) * 100;
                    const readHeight = (row.read / maxVal) * 100;
                    const failHeight = (row.failed / maxVal) * 100;

                    return (
                      <div key={row.date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        <div className="w-full flex items-end justify-center gap-0.5 h-32">
                          <div style={{ height: `${Math.max(4, delHeight)}%` }} className="w-full bg-blue-500/70 rounded-t-sm" />
                          <div style={{ height: `${Math.max(4, readHeight)}%` }} className="w-full bg-emerald-500/70 rounded-t-sm" />
                          {row.failed > 0 && <div style={{ height: `${Math.max(4, failHeight)}%` }} className="w-full bg-red-500/70 rounded-t-sm" />}
                        </div>
                        <span className="text-[9px] font-mono text-muted group-hover:text-fg">{row.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Campaign Comparison Table */}
          <div className="bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl p-8 text-left space-y-4">
            <h4 className="text-xs font-black text-fg/30 uppercase tracking-widest px-1">Campaigns Performance Comparison</h4>

            {campaignComparison.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center italic">No campaigns launched in this time window.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border text-[9px] font-black text-muted uppercase tracking-widest">
                      <th className="pb-3 px-3">Campaign</th>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3 text-center">Sent</th>
                      <th className="pb-3 px-3 text-center">Delivered</th>
                      <th className="pb-3 px-3 text-center">Read</th>
                      <th className="pb-3 px-3 text-center">Delivery Rate</th>
                      <th className="pb-3 px-3 text-right">Read Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {campaignComparison.map((c: any) => (
                      <tr key={c.id} className="hover:bg-glass-input/20 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-fg">{c.name}</td>
                        <td className="py-3.5 px-3 font-mono text-muted text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{c.sent}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-blue-400">{c.delivered}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-emerald-400">{c.read}</td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-400">{c.deliveryRate}%</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400">{c.readRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
