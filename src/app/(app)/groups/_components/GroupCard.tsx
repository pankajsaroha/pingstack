'use client';

import { Folder, Plus } from 'lucide-react';

interface GroupCardProps {
  group: any;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onManage: (group: any) => void;
}

export default function GroupCard({
  group,
  selectedIds,
  onToggleSelection,
  onManage,
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
        <h3 className="text-lg font-black text-fg tracking-tight truncate">{group.name}</h3>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-glass-border">
        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-glass-input text-fg/50 border border-glass-border">
          {group.public_id}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onManage(group);
          }}
          className="text-xs font-black text-indigo-400 hover:text-fg transition-colors cursor-pointer flex items-center py-2 px-3 rounded-xl hover:bg-glass-input border-0 bg-transparent outline-none"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Manage List
        </button>
      </div>
    </div>
  );
}
