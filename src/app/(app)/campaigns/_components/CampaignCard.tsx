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

  const getStatusBadge = () => {
    if (campaign.scheduled_at && campaign.status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <Calendar className="w-3 h-3" />
          Scheduled
        </span>
      );
    }
    if (campaign.status === 'running') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          Running
        </span>
      );
    }
    if (campaign.status === 'completed' || campaign.status === 'passed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Passed
        </span>
      );
    }
    if (campaign.status === 'partial_success' || campaign.status === 'partially_failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <AlertCircle className="w-3 h-3" />
          Partial
        </span>
      );
    }
    if (campaign.status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
        {campaign.status}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{campaign.name}</h3>
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-indigo-500" />
              <span>Template: <strong className="text-zinc-800 dark:text-zinc-200 font-medium">{campaign.templates?.name || 'Standard Dispatch'}</strong></span>
            </span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]" suppressHydrationWarning>
              {new Date(campaign.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Retry Failed Messages Button */}
          {isFailedState && onRetryFailed && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetryFailed(campaign.id)}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Retry ({failedCount})</span>
            </button>
          )}

          {/* Detailed Logs & Messages Button */}
          <button
            type="button"
            onClick={() => onViewReport(campaign)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Logs</span>
          </button>

          {/* Delete Campaign Button */}
          {onDeleteCampaign && (
            <button
              type="button"
              title="Delete Campaign & Logs"
              disabled={isDeleting}
              onClick={() => onDeleteCampaign(campaign.id)}
              className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Delivery Performance Bar & Stat Grid */}
      <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
        {/* Progress Bar */}
        {total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-indigo-500" />
                <span>Delivery Health</span>
              </span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{successPct}% Success</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${successPct}%` }} title={`Delivered: ${delivered + read}`} />
              <div className="bg-blue-500 transition-all duration-500" style={{ width: `${total > 0 ? (sent / total) * 100 : 0}%` }} title={`Sent: ${sent}`} />
              <div className="bg-rose-500 transition-all duration-500" style={{ width: `${failPct}%` }} title={`Failed: ${failed}`} />
            </div>
          </div>
        )}

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 p-2.5 rounded-lg">
            <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Sent</p>
            <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">{sent}</p>
          </div>

          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 p-2.5 rounded-lg">
            <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase">Delivered</p>
            <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{delivered}</p>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 p-2.5 rounded-lg">
            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase">Read</p>
            <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{read}</p>
          </div>

          <div className={`p-2.5 rounded-lg border transition-all ${
            failed > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/40'
              : 'bg-zinc-100/70 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/60'
          }`}>
            <p className={`text-[10px] font-mono uppercase ${failed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
              Failed
            </p>
            <p className={`text-base font-bold font-mono mt-0.5 ${failed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {failed}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
