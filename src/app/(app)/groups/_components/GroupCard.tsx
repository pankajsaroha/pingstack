'use client';

import { Folder, Plus, Send } from 'lucide-react';

interface GroupCardProps {
  group: any;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onManage: (group: any) => void;
  onLaunchCampaign: (group: any) => void;
}

export default function GroupCard({
  group,
  selectedIds,
  onToggleSelection,
  onManage,
  onLaunchCampaign,
}: GroupCardProps) {
  const isSelected = selectedIds.has(group.id);

  return (
    <div
      className={`bg-glass-card border p-6 rounded-[2.5rem] relative shadow-2xl hover:border-glass-border hover:bg-glass-card transition-all duration-300 ${
        isSelected ? 'border-white ring-1 ring-white/10 bg-glass-card' : 'border-glass-border'
      }`}
    >
      <div className="absolute top-5 right-5 z-30">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelection(group.id)}
          className="h-5 w-5 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
        />
      </div>
      <div className="flex items-center mb-6 pr-8 text-left">
        <div className="w-12 h-12 bg-glass-input border border-glass-border text-fg rounded-2xl flex items-center justify-center mr-4">
          <Folder className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-fg tracking-tight truncate">{group.name}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-glass-input text-fg/50 border border-glass-border mt-1">
            {group.public_id}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-5 border-t border-glass-border">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onManage(group);
          }}
          className="px-4 py-2.5 bg-glass-input border border-glass-border hover:bg-white/10 hover:border-fg/20 text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center shadow-sm cursor-pointer outline-none"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
          Manage List
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLaunchCampaign(group);
          }}
          className="px-4 py-2.5 bg-fg text-bg hover:opacity-90 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center cursor-pointer border-0 outline-none"
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Launch Campaign
        </button>
      </div>
    </div>
  );
}
