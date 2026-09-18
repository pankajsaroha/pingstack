'use client';

import { Folder, Users, Send, Download, Settings, Pencil } from 'lucide-react';

interface GroupCardProps {
  group: any;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onManage: (group: any) => void;
  onEdit?: (group: any) => void;
  onLaunchCampaign: (group: any) => void;
  onDownloadExcel: (group: any) => void;
}

export default function GroupCard({
  group,
  selectedIds,
  onToggleSelection,
  onManage,
  onEdit,
  onLaunchCampaign,
  onDownloadExcel,
}: GroupCardProps) {
  const isSelected = selectedIds.has(group.id);
  const contactCount = group.contacts_count || group.contacts?.length || 0;

  return (
    <div
      className={`group bg-white dark:bg-zinc-900/60 border p-4 sm:p-5 rounded-xl shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left flex flex-col justify-between ${
        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-zinc-200 dark:border-zinc-800/80'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate" title={group.name}>
                  {group.name}
                </h3>
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(group);
                    }}
                    className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer"
                    title="Edit group name"
                    aria-label={`Edit ${group.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {contactCount} {contactCount === 1 ? 'contact' : 'contacts'}
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelection(group.id)}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 mt-1"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 mt-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onManage(group);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Settings className="w-3 h-3 text-zinc-400" />
            <span>Manage</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadExcel(group);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Download Group as Excel/CSV"
          >
            <Download className="w-3 h-3 text-emerald-500" />
            <span>Export</span>
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLaunchCampaign(group);
          }}
          className="flex items-center gap-1 px-3 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Send className="w-3 h-3" />
          <span>Broadcast</span>
        </button>
      </div>
    </div>
  );
}
