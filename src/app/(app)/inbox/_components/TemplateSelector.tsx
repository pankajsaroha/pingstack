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
    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 flex flex-col max-h-[80%] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Select Template</h3>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mt-0.5">Approved Meta Elements</p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/templates"
              className="flex items-center px-2.5 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Link>
            <button
              onClick={onClose}
              className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {selectedTemplate ? (
            /* Variable fill-in view */
            <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 p-3 rounded-lg">
                <h4 className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Meta Content Preview</h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 italic leading-relaxed">&quot;{selectedTemplate.content}&quot;</p>
              </div>

              <div className="space-y-3">
                {Array.from({ length: (selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).length }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-0.5">Variable {i + 1}</label>
                    <input
                      type="text"
                      placeholder={`Value for {{${i + 1}}}...`}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all text-zinc-900 dark:text-zinc-100"
                      value={templateVars[i + 1] || ''}
                      onChange={(e) => setTemplateVars({ ...templateVars, [i + 1]: e.target.value })}
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  onClick={() => { setSelectedTemplate(null); setTemplateVars({}); }}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => onSend(selectedTemplate, templateVars)}
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs transition-opacity"
                >
                  Send Now
                </button>
              </div>
            </div>
          ) : templates.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400 dark:text-zinc-600">
              <Zap className="w-8 h-8 mb-2" />
              <p className="font-bold text-[10px] uppercase tracking-wider">No templates configured</p>
            </div>
          ) : (
            /* Template list */
            templates.map(tpl => {
              const hasVars = tpl.content?.includes('{{1}}');
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 cursor-pointer group transition-all relative active:scale-[0.99] flex items-center"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate">{tpl.name}</h4>
                        {hasVars && (
                          <span className="ml-2 px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[8px] font-bold uppercase tracking-wider">Variable</span>
                        )}
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2 shrink-0">{tpl.language}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2 italic">&quot;{tpl.content}&quot;</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    <div className="w-7 h-7 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center shadow-2xs">
                      {hasVars ? <ArrowRight className="w-3 h-3" /> : <Send className="w-3 h-3 ml-0.5" />}
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
