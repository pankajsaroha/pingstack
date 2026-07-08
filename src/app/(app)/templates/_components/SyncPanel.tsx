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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-fg text-left">Message Templates</h1>
        <p className="text-muted text-sm font-semibold mt-1">Design and sync rich templates directly with Meta WhatsApp systems.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex items-center px-5 py-3 bg-glass-input border border-glass-border rounded-2xl text-xs font-black uppercase tracking-widest text-fg hover:bg-white/10 transition-all cursor-pointer outline-none"
        >
          <RefreshCw className={`mr-2 h-4 w-4 text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
          Sync with Meta
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center px-5 py-3 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-widest text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer outline-none"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedCount})
          </button>
        )}

        <button
          onClick={onCreate}
          className="flex items-center px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 cursor-pointer border-0 outline-none"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </button>
      </div>
    </div>
  );
}
