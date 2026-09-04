'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  Radio,
} from 'lucide-react';

export default function AdminMessagesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');
  const [sort, setSort] = useState('sent');

  const fetchMessagesAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages?range=${range}&sort=${sort}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching messaging analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessagesAnalytics();
  }, [range, sort]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Aggregating messaging analytics...</span>
        </div>
      </div>
    );
  }

  const { metrics, chartData, businesses } = data || {
    metrics: { totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0, deliveryRate: 100, readRate: 0, failureRate: 0 },
    chartData: [],
    businesses: [],
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>Messaging Analytics</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Platform-wide message delivery performance, failure rates, and customer volume ranking.
          </p>
        </div>

        {/* Time Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs self-start sm:self-auto shadow-2xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '90d', label: '90 Days' },
            { id: 'all', label: 'All Time' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                range === r.id
                  ? 'bg-zinc-900 dark:bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Messages */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Sent</div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {metrics.totalSent.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">In selected window</div>
        </div>

        {/* Delivered Rate */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Delivered</div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {metrics.totalDelivered.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
            {metrics.deliveryRate}% delivery rate
          </div>
        </div>

        {/* Read Rate */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Read</div>
          <div className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
            {metrics.totalRead.toLocaleString()}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
            {metrics.readRate}% read rate
          </div>
        </div>

        {/* Failure Rate */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Failed</div>
          <div className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
            {metrics.totalFailed.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            {metrics.failureRate}% failure rate
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Volume Over Time</h3>
            <p className="text-xs text-zinc-500">Daily message dispatch and delivery timeline</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
              <span>Sent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              <span>Delivered</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span>Failed</span>
            </span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="h-48 w-full flex items-end justify-between gap-1.5 pt-6 pb-2 border-b border-zinc-200 dark:border-zinc-800/60 overflow-x-auto">
          {chartData.map((d: any) => {
            const maxVal = Math.max(...chartData.map((x: any) => x.sent), 10);
            const heightPct = Math.max(6, Math.round((d.sent / maxVal) * 100));

            return (
              <div key={d.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-1.5 group h-full justify-end">
                <div className="text-[9px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.sent}
                </div>
                <div
                  className="w-full max-w-[36px] bg-zinc-100 dark:bg-zinc-800/80 rounded-t-md relative overflow-hidden flex flex-col justify-end"
                  style={{ height: `${heightPct}%` }}
                >
                  <div
                    className="w-full bg-indigo-500 dark:bg-indigo-500/80 rounded-t-md group-hover:bg-indigo-600 dark:group-hover:bg-indigo-400 transition-all"
                    style={{ height: '100%' }}
                  />
                </div>
                <div className="text-[10px] font-mono text-zinc-500 truncate">{d.date}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking / Per-Business Table */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden space-y-3 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Messaging Breakdown By Business</h3>
            <p className="text-xs text-zinc-500">Identify high-volume customers and accounts with delivery problems</p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 outline-none shadow-2xs"
            >
              <option value="sent">Messages Sent (High to Low)</option>
              <option value="delivered">Delivered Count</option>
              <option value="failed">Failed Count</option>
              <option value="rate">Delivery Rate</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-mono text-[11px]">
                <th className="py-2.5 font-medium">Business</th>
                <th className="py-2.5 font-medium">Plan</th>
                <th className="py-2.5 font-medium text-right">Sent</th>
                <th className="py-2.5 font-medium text-right">Delivered</th>
                <th className="py-2.5 font-medium text-right">Read</th>
                <th className="py-2.5 font-medium text-right">Failed</th>
                <th className="py-2.5 font-medium text-right">Delivery Rate</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No messaging data found for this period.
                  </td>
                </tr>
              ) : (
                businesses.map((b: any) => (
                  <tr key={b.tenantId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">
                      <Link href={`/admin/businesses/${b.tenantId}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                        {b.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {b.planType}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-zinc-900 dark:text-zinc-200">{b.sent.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{b.delivered.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono text-indigo-600 dark:text-indigo-400">{b.read.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono text-rose-600 dark:text-rose-400">{b.failed.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono font-semibold">
                      <span className={b.deliveryRate < 80 && b.sent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {b.deliveryRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/businesses/${b.tenantId}`}
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
    </div>
  );
}
