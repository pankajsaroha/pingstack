'use client';

import { RefreshCw, Trash2, Plus } from 'lucide-react';

interface SyncPanelProps {
  syncing: boolean;
  selectedCount: number;
  onSync: () => void;
  onDeleteSelected: () => void;
  onCreate: () => void;
}

export default function SyncPanel({
  syncing,
  selectedCount,
  onSync,
  onDeleteSelected,
  onCreate,
}: SyncPanelProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60 mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Message Templates</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Design and synchronize message templates directly with Meta WhatsApp Cloud API.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync with Meta'}</span>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedCount})</span>
          </button>
        )}

        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Template</span>
        </button>
      </div>
    </div>
  );
}
