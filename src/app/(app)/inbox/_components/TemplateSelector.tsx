'use client';

import { useState } from 'react';
import { Zap, X, Plus, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TemplateSelectorProps {
  templates: any[];
  sending: boolean;
  onSend: (template: any, vars: Record<string, string>) => void;
  onClose: () => void;
}

export default function TemplateSelector({ templates, sending, onSend, onClose }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  const handleSelect = (tpl: any) => {
    const hasVars = tpl.content?.includes('{{1}}');
    if (hasVars) {
      setSelectedTemplate(tpl);
      setTemplateVars({});
    } else {
      onSend(tpl, {});
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl p-6 flex flex-col max-h-[80%] animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">Select Template</h3>
            <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest mt-1">Approved Meta Elements</p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/templates"
              className="flex items-center px-3 py-1.5 bg-fg text-bg hover:opacity-90 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Link>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-glass-input border border-glass-border hover:bg-white/10 text-fg rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {selectedTemplate ? (
            /* Variable fill-in view */
            <div className="animate-in slide-in-from-right-4 duration-300 space-y-5">
              <div className="bg-glass-input border border-glass-border p-4 rounded-2xl">
                <h4 className="text-[8px] font-black text-fg/30 uppercase tracking-widest mb-1.5">Meta Content Preview</h4>
                <p className="text-xs text-fg/70 italic leading-relaxed">&quot;{selectedTemplate.content}&quot;</p>
              </div>

              <div className="space-y-4">
                {Array.from({ length: (selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).length }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <label className="text-[9px] font-black text-fg/30 uppercase tracking-widest ml-1">Variable {i + 1}</label>
                    <input
                      type="text"
                      placeholder={`Value for {{${i + 1}}}...`}
                      className="w-full bg-glass-input border border-glass-border rounded-2xl px-4 py-3 text-xs font-semibold focus:border-indigo-500 focus:outline-none transition-all text-fg"
                      value={templateVars[i + 1] || ''}
                      onChange={(e) => setTemplateVars({ ...templateVars, [i + 1]: e.target.value })}
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setSelectedTemplate(null); setTemplateVars({}); }}
                  className="flex-1 px-6 py-3.5 border border-glass-border hover:bg-glass-input text-muted hover:text-fg rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => onSend(selectedTemplate, templateVars)}
                  disabled={sending}
                  className="flex-1 px-6 py-3.5 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-lg"
                >
                  Send Now
                </button>
              </div>
            </div>
          ) : templates.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
              <Zap className="w-8 h-8 text-fg mb-2" />
              <p className="text-fg font-black text-[9px] uppercase tracking-widest">No templates configured</p>
            </div>
          ) : (
            /* Template list */
            templates.map(tpl => {
              const hasVars = tpl.content?.includes('{{1}}');
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className="p-4 bg-glass-input border border-glass-border rounded-2xl hover:border-glass-border hover:bg-glass-card cursor-pointer group transition-all relative active:scale-[0.98] flex items-center"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center">
                        <h4 className="text-xs font-black text-fg group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate">{tpl.name}</h4>
                        {hasVars && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[7px] font-black uppercase tracking-widest">Variable</span>
                        )}
                      </div>
                      <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2 shrink-0">{tpl.language}</span>
                    </div>
                    <p className="text-[10px] text-muted leading-snug font-semibold line-clamp-2 italic">&quot;{tpl.content}&quot;</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    <div className="w-8 h-8 bg-fg text-bg rounded-full flex items-center justify-center shadow-lg">
                      {hasVars ? <ArrowRight className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5 ml-0.5" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
