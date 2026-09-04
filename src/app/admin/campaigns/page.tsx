'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  ArrowRight,
  RefreshCw,
  Loader2,
  Users,
} from 'lucide-react';

export default function AdminCampaignsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Loading campaign analytics...</span>
        </div>
      </div>
    );
  }

  const { metrics, campaigns } = data || {
    metrics: {
      campaignsCreated: 0,
      campaignsRunning: 0,
      campaignsCompleted: 0,
      campaignsFailed: 0,
      totalRecipients: 0,
      successfulSends: 0,
      failedSends: 0,
      completionRate: 100,
      failureRate: 0,
    },
    campaigns: [],
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Running
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {status || 'Draft'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>Campaign Analytics</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Platform broadcast volume, execution performance, and completion rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 outline-none shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Campaigns</div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {metrics.campaignsCreated.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">Platform lifetime</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Active / Running</div>
          <div className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
            {metrics.campaignsRunning}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">Currently dispatching</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Recipients</div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {metrics.totalRecipients.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">{metrics.successfulSends.toLocaleString()} delivered</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Success Rate</div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {metrics.completionRate}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">Broadcast delivery</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 font-mono text-[11px]">
                <th className="py-3 px-4 font-medium">Campaign</th>
                <th className="py-3 px-4 font-medium">Business</th>
                <th className="py-3 px-4 font-medium">Template</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Audience</th>
                <th className="py-3 px-4 font-medium text-right">Delivered</th>
                <th className="py-3 px-4 font-medium text-right">Completion</th>
                <th className="py-3 px-4 font-medium text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                campaigns.map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-200">
                      <div>{c.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{c.publicId || c.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/businesses/${c.businessId}`}
                        className="font-medium text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {c.businessName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                      {c.templateName}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(c.status)}</td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-800 dark:text-zinc-200">
                      {c.recipients.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {c.delivered.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-200">
                      {c.completionRate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
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
