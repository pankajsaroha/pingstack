'use client';

import { Activity, RotateCcw, Loader2, BarChart2, Calendar, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface CampaignCardProps {
  campaign: any;
  planType: string;
  isRetrying?: boolean;
  isDeleting?: boolean;
  onViewReport: (campaign: any) => void;
  onRetryFailed?: (campaignId: string) => void;
  onDeleteCampaign?: (campaignId: string) => void;
}

export default function CampaignCard({
  campaign,
  planType,
  isRetrying,
  isDeleting,
  onViewReport,
  onRetryFailed,
  onDeleteCampaign,
}: CampaignCardProps) {
  const sent = campaign.stats?.sent || 0;
  const delivered = campaign.stats?.delivered || 0;
  const read = campaign.stats?.read || 0;
  const failed = campaign.stats?.failed || 0;
  const pending = campaign.stats?.pending || 0;
  const total = sent + delivered + read + failed + pending;

  const failedCount = failed;
  const isFailedState = campaign.status === 'failed' || campaign.status === 'partially_failed' || failedCount > 0;

  // Calculate delivery percentage
  const successPct = total > 0 ? Math.round(((delivered + read) / Math.max(1, total)) * 100) : 0;
  const failPct = total > 0 ? Math.round((failed / Math.max(1, total)) * 100) : 0;

  return (
    <div className="bg-glass-card border border-glass-border p-6 rounded-[2.5rem] shadow-2xl hover:border-indigo-500/30 transition-all duration-300 relative group overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4 relative z-10">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <h3 className="text-xl font-black text-fg tracking-tight">{campaign.name}</h3>
            
            {campaign.scheduled_at && campaign.status === 'draft' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                <Calendar className="w-3 h-3 mr-1 text-indigo-400" />
                Scheduled
              </span>
            )}

            {campaign.status === 'running' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/15 text-blue-300 border border-blue-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-ping" />
                Running
              </span>
            )}

            {(campaign.status === 'completed' || campaign.status === 'passed') && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                Passed
              </span>
            )}

            {(campaign.status === 'partial_success' || campaign.status === 'partially_failed') && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3 h-3 mr-1 text-amber-400" />
                Partial Success
              </span>
            )}

            {campaign.status === 'failed' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/15 text-red-300 border border-red-500/30">
                <AlertCircle className="w-3 h-3 mr-1 text-red-400" />
                Failed
              </span>
            )}

            {campaign.status !== 'running' && campaign.status !== 'completed' && campaign.status !== 'passed' && campaign.status !== 'partial_success' && campaign.status !== 'partially_failed' && campaign.status !== 'failed' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-glass-input text-fg/60 border border-glass-border">
                {campaign.status}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs text-muted font-medium mt-2">
            <span className="flex items-center text-fg/70">
              <FileText className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              Template: <strong className="ml-1 text-fg font-semibold">{campaign.templates?.name || 'Standard Dispatch'}</strong>
            </span>
            <span>•</span>
            <span className="text-fg/50 font-mono text-[11px]">
              {new Date(campaign.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          {/* Retry Failed Messages Button */}
          {isFailedState && onRetryFailed && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetryFailed(campaign.id)}
              className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center shadow-lg active:scale-95 border-0 outline-none"
            >
              {isRetrying ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-red-400" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-red-400" />
              )}
              {isRetrying ? 'Retrying...' : `Retry (${failedCount || 'Failed'})`}
            </button>
          )}

          {/* Detailed Logs & Messages Button */}
          <button
            type="button"
            onClick={() => onViewReport(campaign)}
            className="px-4 py-2 bg-glass-input hover:bg-glass-card border border-glass-border hover:border-indigo-500/40 text-fg rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center shadow-md active:scale-95"
          >
            <BarChart2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            Detailed Logs
          </button>

          {/* Delete Campaign Button */}
          {onDeleteCampaign && (
            <button
              type="button"
              title="Delete Campaign & Logs"
              disabled={isDeleting}
              onClick={() => onDeleteCampaign(campaign.id)}
              className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 border border-glass-border hover:border-red-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Delivery Performance Bar & Stat Grid */}
      <div className="border-t border-glass-border pt-5 mt-3">
        {/* Progress Bar */}
        {total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted mb-1.5">
              <span className="flex items-center text-fg/60">
                <Activity className="w-3 h-3 mr-1 text-indigo-400" /> Delivery Health
              </span>
              <span className="text-fg font-mono">{successPct}% Success</span>
            </div>
            <div className="w-full bg-glass-input h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${successPct}%` }} title={`Successful: ${delivered + read}`} />
              <div className="bg-blue-500 transition-all duration-500" style={{ width: `${total > 0 ? (sent / total) * 100 : 0}%` }} title={`Sent: ${sent}`} />
              <div className="bg-red-500 transition-all duration-500" style={{ width: `${failPct}%` }} title={`Failed: ${failed}`} />
            </div>
          </div>
        )}

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-glass-card border border-glass-border p-3.5 rounded-2xl">
            <p className="text-[9px] text-fg/40 font-black uppercase tracking-widest mb-1">Sent</p>
            <p className="text-lg font-black text-fg font-mono">{sent}</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl">
            <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest mb-1">Delivered</p>
            <p className="text-lg font-black text-blue-400 font-mono">{delivered}</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
            <p className="text-[9px] text-emerald-300 font-black uppercase tracking-widest mb-1">Read</p>
            <p className="text-lg font-black text-emerald-400 font-mono">{read}</p>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all ${
            failed > 0
              ? 'bg-red-500/15 border-red-500/30'
              : 'bg-glass-card border-glass-border'
          }`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${failed > 0 ? 'text-red-300' : 'text-fg/40'}`}>
              Failed
            </p>
            <p className={`text-lg font-black font-mono ${failed > 0 ? 'text-red-400' : 'text-fg'}`}>
              {failed}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
