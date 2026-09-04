'use client';

import { MessageSquare, LayoutTemplate, ArrowDownLeft } from 'lucide-react';

interface StatsGridProps {
  stats: {
    conversations: number;
    templatesApproved: number;
    inboundMessages: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const items = [
    { 
      label: 'Total Conversations', 
      value: (stats.conversations || 0).toLocaleString(),
      icon: MessageSquare,
      subtext: 'Active chat threads'
    },
    { 
      label: 'Templates Approved', 
      value: (stats.templatesApproved || 0).toLocaleString(),
      icon: LayoutTemplate,
      subtext: 'Verified with Meta Cloud API'
    },
    { 
      label: 'Inbound Logged Messages', 
      value: (stats.inboundMessages || 0).toLocaleString(),
      icon: ArrowDownLeft,
      subtext: 'Received via Webhook'
    }
  ];

  return (
    <div className="mb-8">
      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold mb-3">
        Messaging Activity Metrics
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {items.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="p-4 sm:p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{stat.label}</span>
                <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
                {stat.value}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {stat.subtext}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
