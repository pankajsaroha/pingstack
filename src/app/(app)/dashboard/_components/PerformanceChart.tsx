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
  return (
    <div className="mt-12 bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl mb-12 animate-in slide-in-from-bottom-4 duration-700">
      <h3 className="text-lg font-black text-fg mb-8 flex items-center">
        <BarChart3 className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
        Performance Analysis
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 bg-glass-card rounded-2xl border border-glass-border text-center">
          <span className="text-[9px] font-black text-fg/30 uppercase tracking-wider block mb-2">Sent Logs</span>
          <span className="text-2xl font-black text-fg">{stats.sent}</span>
        </div>
        <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10 text-center">
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">Delivered</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.delivered}</span>
          <span className="text-[9px] font-bold text-fg/40 block mt-1.5">{Math.round((stats.delivered / stats.sent) * 100)}% API hit</span>
        </div>
        <div className="p-6 bg-green-50/50 dark:bg-green-950/20 rounded-2xl border border-green-100 dark:border-green-900/30 text-center">
          <span className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider block mb-2">Read Received</span>
          <span className="text-2xl font-black text-green-700 dark:text-green-400">{stats.read}</span>
          <span className="text-[9px] font-bold text-fg/40 block mt-1.5">{Math.round((stats.read / (stats.delivered || 1)) * 100)}% Read rate</span>
        </div>
        <div className="p-6 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 text-center">
          <span className="text-[9px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider block mb-2">Rejected Failures</span>
          <span className="text-2xl font-black text-red-700 dark:text-red-400">{stats.failed}</span>
        </div>
      </div>
    </div>
  );
}
