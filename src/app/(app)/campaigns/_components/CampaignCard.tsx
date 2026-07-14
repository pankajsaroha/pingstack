'use client';

import { Activity } from 'lucide-react';

interface CampaignCardProps {
  campaign: any;
  planType: string;
  onViewReport: (campaign: any) => void;
}

export default function CampaignCard({ campaign, planType, onViewReport }: CampaignCardProps) {
  return (
    <div className="bg-glass-card border border-glass-border p-6 rounded-[2.5rem] shadow-2xl hover:border-glass-border hover:bg-glass-card transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-black text-fg tracking-tight">{campaign.name}</h3>
            {campaign.scheduled_at && campaign.status === 'draft' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                Scheduled
              </span>
            )}
          </div>
          <p className="text-xs text-muted font-semibold mt-1">
            Template: <span className="text-fg/60">{campaign.templates?.name || 'Unknown'}</span>
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
            campaign.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            campaign.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            campaign.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-glass-input text-fg/55 border border-glass-border'
          }`}>
            {campaign.status}
          </span>
          {campaign.scheduled_at && campaign.status === 'draft' && (
            <p className="text-[10px] text-fg/30 mt-1.5 font-bold">Due: {new Date(campaign.scheduled_at).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="border-t border-glass-border pt-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[9px] font-black text-fg/30 uppercase tracking-widest flex items-center">
            <Activity className="mr-2 h-4 w-4 text-indigo-400" /> Delivery Performance
          </h4>
          {planType !== 'starter' && (
            <button
              onClick={() => onViewReport(campaign)}
              className="text-[10px] font-black text-indigo-400 hover:text-fg uppercase tracking-widest transition-all cursor-pointer bg-transparent border-0 outline-none"
            >
              Detailed Logs &rarr;
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-glass-card border border-glass-border p-4 rounded-2xl">
            <p className="text-[9px] text-fg/30 font-black uppercase tracking-wider mb-1">Sent</p>
            <p className="text-xl font-black text-fg">{campaign.stats?.sent || 0}</p>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
            <p className="text-[9px] text-blue-400/90 font-black uppercase tracking-wider mb-1">Delivered</p>
            <p className="text-xl font-black text-blue-400">{campaign.stats?.delivered || 0}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
            <p className="text-[9px] text-emerald-400/90 font-black uppercase tracking-wider mb-1">Read</p>
            <p className="text-xl font-black text-emerald-400">{campaign.stats?.read || 0}</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
            <p className="text-[9px] text-red-400/90 font-black uppercase tracking-wider mb-1">Failed</p>
            <p className="text-xl font-black text-red-400">{campaign.stats?.failed || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
