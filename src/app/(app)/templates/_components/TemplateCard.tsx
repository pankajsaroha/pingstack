'use client';

import { useState } from 'react';
import { Globe, Tag, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { parseMetaRejectionReason } from '@/lib/templates';

interface TemplateCardProps {
  template: any;
  selectedIds: Set<string>;
  onToggleSelection: (id: string, e: React.MouseEvent) => void;
  onEditRejected?: (template: any) => void;
  onDeleteSingle?: (id: string) => void;
}

export default function TemplateCard({
  template,
  selectedIds,
  onToggleSelection,
  onEditRejected,
  onDeleteSingle,
}: TemplateCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isSelected = selectedIds.has(template.id);
  const isRejected = template.status === 'REJECTED';

  const rawRejectionReason = template.metadata?.rejected_reason || 
    template.metadata?.rejection_reason_code || 
    template.rejected_reason;

  const rejectionInfo = isRejected ? parseMetaRejectionReason(rawRejectionReason) : null;

  return (
    <div
      className={`bg-white dark:bg-zinc-900/60 border p-3.5 sm:p-5 rounded-xl shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer text-left overflow-hidden ${
        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-zinc-200 dark:border-zinc-800/80'
      }`}
      onClick={(e) => onToggleSelection(template.id, e)}
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[220px] sm:max-w-none">{template.name}</h3>

          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
            template.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
            template.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`}>
            {template.status || 'PENDING'}
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
            <Globe className="w-3 h-3" />
            <span>{template.language || 'en_US'}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
            <Tag className="w-3 h-3" />
            <span>{template.category || 'UTILITY'}</span>
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/40">
          <div className="flex items-center gap-2">
            {template.status !== 'APPROVED' && onEditRejected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditRejected(template);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>{isRejected ? 'Edit & Resubmit' : 'Edit'}</span>
              </button>
            )}

            {onDeleteSingle && (
              <button
                type="button"
                title="Delete template"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSingle(template.id);
                }}
                className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
          />
        </div>
      </div>

      {/* Meta ID Identifier */}
      <div className="text-[11px] font-mono text-zinc-400 mb-2 truncate">
        Meta ID: <span className="text-zinc-600 dark:text-zinc-300 select-all">{template.template_id || 'Pending Meta Sync'}</span>
      </div>

      {/* Message Body Content */}
      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed break-words">
        {template.content}
      </div>

      {/* Rejection Diagnostics Block (Compact by Default on Mobile) */}
      {isRejected && rejectionInfo && (
        <div className="mt-3 pt-2.5 border-t border-rose-200/50 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl p-3 sm:p-3.5 border text-left">
          {/* Default Summary: Reason & Meta Code */}
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200 shrink-0">
                  Reason:
                </span>
                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                  {rejectionInfo.reason}
                </span>
                {rejectionInfo.code && rejectionInfo.code !== 'NOT_SPECIFIED' && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 shrink-0">
                    Meta reason: {rejectionInfo.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Row: Edit & Resubmit + View Details Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-rose-200/40 dark:border-rose-900/30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditRejected?.(template);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit &amp; Resubmit</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer bg-transparent border-0 outline-none py-1"
            >
              <span>{showDetails ? 'Hide details' : 'View details'}</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expanded State: Why?, Suggested Fix & Technical Metadata */}
          {showDetails && (
            <div className="mt-2.5 pt-2.5 border-t border-dashed border-rose-200 dark:border-rose-900/50 space-y-2 animate-in fade-in duration-200">
              {rejectionInfo.why && (
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Why? </span>
                  {rejectionInfo.why}
                </div>
              )}

              {rejectionInfo.suggestedFix && (
                <div className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white/60 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                  <span className="font-bold text-amber-700 dark:text-amber-400">Suggested fix: </span>
                  {rejectionInfo.suggestedFix}
                </div>
              )}

              <div className="pt-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 space-y-0.5">
                <div><strong className="text-zinc-700 dark:text-zinc-300">Meta Template ID:</strong> {template.template_id || 'N/A'}</div>
                <div><strong className="text-zinc-700 dark:text-zinc-300">Meta Status Code:</strong> {template.status}</div>
                <div><strong className="text-zinc-700 dark:text-zinc-300">Rejection Code:</strong> {rejectionInfo.code}</div>
                {template.metadata?.last_meta_status_update && (
                  <div><strong className="text-zinc-700 dark:text-zinc-300">Last Status Update:</strong> {new Date(template.metadata.last_meta_status_update).toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


