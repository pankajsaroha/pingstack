'use client';

import { BarChart3 } from 'lucide-react';

interface PerformanceChartProps {
  stats: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export default function PerformanceChart({ stats }: PerformanceChartProps) {
  const deliveryRate = stats.sent ? Math.round((stats.delivered / stats.sent) * 100) : 0;
  const readRate = stats.delivered ? Math.round((stats.read / stats.delivered) * 100) : 0;

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Dispatch Performance Analytics
          </h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">Real-time stats</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-100 dark:border-zinc-800/60 text-center">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">Total Sent</span>
          <span className="text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">{stats.sent.toLocaleString()}</span>
        </div>

        <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30 text-center">
          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Delivered</span>
          <span className="text-xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">{stats.delivered.toLocaleString()}</span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">{deliveryRate}% delivery</span>
        </div>

        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-center">
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">Read Received</span>
          <span className="text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{stats.read.toLocaleString()}</span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">{readRate}% read rate</span>
        </div>

        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30 text-center">
          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">Failed / Undelivered</span>
          <span className="text-xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">{stats.failed.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
