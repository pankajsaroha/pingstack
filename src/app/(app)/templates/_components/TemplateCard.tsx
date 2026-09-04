'use client';

import { Globe, Tag, Pencil, Trash2 } from 'lucide-react';

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
  const isSelected = selectedIds.has(template.id);

  return (
    <div
      className={`bg-white dark:bg-zinc-900/60 border p-4 sm:p-5 rounded-xl shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer text-left ${
        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-zinc-200 dark:border-zinc-800/80'
      }`}
      onClick={(e) => onToggleSelection(template.id, e)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{template.name}</h3>

          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
            template.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
            template.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`}>
            {template.status || 'PENDING'}
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
            <Globe className="w-3 h-3" />
            <span>{template.language || 'en_US'}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Tag className="w-3 h-3" />
            <span>{template.category || 'UTILITY'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
              <span>Edit</span>
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

          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="text-[11px] font-mono text-zinc-400 mb-2">
        Meta ID: <span className="text-zinc-600 dark:text-zinc-300 select-all">{template.template_id || 'Pending Meta Sync'}</span>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
        {template.content}
      </div>
    </div>
  );
}
