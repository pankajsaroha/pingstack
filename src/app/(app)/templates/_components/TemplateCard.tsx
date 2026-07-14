'use client';

import { Globe, Tag, LayoutTemplate } from 'lucide-react';

interface TemplateCardProps {
  template: any;
  selectedIds: Set<string>;
  onToggleSelection: (id: string, e: React.MouseEvent) => void;
}

export default function TemplateCard({
  template,
  selectedIds,
  onToggleSelection,
}: TemplateCardProps) {
  const isSelected = selectedIds.has(template.id);

  return (
    <div
      className={`bg-glass-card border p-6 rounded-[2.5rem] relative shadow-2xl hover:border-glass-border hover:bg-glass-card transition-all duration-300 cursor-pointer text-left ${
        isSelected ? 'border-white ring-1 ring-white/10 bg-glass-card' : 'border-glass-border'
      }`}
      onClick={(e) => onToggleSelection(template.id, e)}
    >
      <div className="absolute top-6 right-6 z-30">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="h-5 w-5 bg-glass-input border-glass-border text-black focus:ring-white rounded cursor-pointer"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 pr-10">
        <h3 className="text-xl font-black text-fg tracking-tight">{template.name}</h3>

        <div className="flex gap-2">
          <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
            template.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            template.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {template.status || 'PENDING'}
          </span>

          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-glass-input text-fg/50 border border-glass-border">
            <Globe className="w-3 h-3 mr-1.5" />
            {template.language || 'en_US'}
          </span>

          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Tag className="w-3 h-3 mr-1.5" />
            {template.category || 'UTILITY'}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-fg/30 font-black uppercase tracking-wider mb-4">Meta ID: <span className="font-mono text-fg/50">{template.template_id}</span></p>

      <div className="bg-glass-card/20 p-5 rounded-2xl border border-glass-border text-sm text-fg/70 whitespace-pre-wrap leading-relaxed relative">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <LayoutTemplate className="w-8 h-8 text-fg" />
        </div>
        {template.content}
      </div>
    </div>
  );
}
