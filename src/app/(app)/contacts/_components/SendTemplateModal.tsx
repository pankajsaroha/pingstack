'use client';

import { useState } from 'react';
import { X, Loader2, ArrowRight, Zap, Check, Send } from 'lucide-react';
import Link from 'next/link';

interface SendTemplateModalProps {
  selectedIds: Set<string>;
  templates: any[];
  contacts: any[];
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSent: (template: any, vars: Record<string, Record<string, string>>) => Promise<void>;
}

export default function SendTemplateModal({
  selectedIds,
  templates,
  contacts,
  onClose,
  onToast,
  onSent,
}: SendTemplateModalProps) {
  const [templateStep, setTemplateStep] = useState<'SELECT' | 'VARS'>('SELECT');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [bulkVars, setBulkVars] = useState<Record<string, Record<string, string>>>({});
  const [sending, setSending] = useState(false);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplate(tpl);
    const hasVars = tpl.content?.includes('{{1}}');
    if (hasVars) {
      setTemplateStep('VARS');
      const initial: any = {};
      Array.from(selectedIds).forEach((cid) => {
        initial[cid] = {};
      });
      setBulkVars(initial);
    } else {
      setTemplateStep('VARS');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || selectedIds.size === 0) return;

    setSending(true);
    try {
      await onSent(selectedTemplate, bulkVars);
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCopyFirstRow = () => {
    const firstId = Array.from(selectedIds)[0];
    const baseVars = bulkVars[firstId] || {};
    const updated = { ...bulkVars };
    Array.from(selectedIds).forEach((cid) => {
      updated[cid] = { ...baseVars };
    });
    setBulkVars(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-glass-border flex justify-between items-center bg-glass-card/10 text-left">
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">
              {templateStep === 'SELECT' ? 'Choose Template' : 'Personalize variables'}
            </h3>
            <p className="text-[9px] font-black text-indigo-400 mt-1.5 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2 animate-pulse" />
              Dispatching to {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-glass-input rounded-xl transition-colors cursor-pointer text-muted hover:text-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          {templateStep === 'SELECT' ? (
            <div className="grid grid-cols-1 gap-4 text-left">
              {templates.filter((t) => t.status === 'APPROVED').map((tpl) => {
                const hasVars = tpl.content?.includes('{{1}}');
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="p-5 bg-glass-input border border-glass-border rounded-2xl hover:border-glass-border hover:bg-glass-card cursor-pointer group transition-all relative active:scale-[0.98] flex items-center shadow-md"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <h4 className="text-xs font-black text-fg group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate">{tpl.name}</h4>
                          {hasVars && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[7px] font-black uppercase tracking-widest shrink-0">Personalization required</span>
                          )}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 ml-2 shrink-0">{tpl.language}</span>
                      </div>
                      <p className="text-xs text-muted leading-snug italic font-semibold line-clamp-2">&quot;{tpl.content}&quot;</p>
                    </div>
                    <div className="w-8 h-8 bg-fg text-bg rounded-full flex items-center justify-center shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6 text-left">
              <div className="bg-glass-card/20 p-5 rounded-2xl border border-glass-border">
                <h4 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center">
                  <Zap className="w-3 h-3 mr-1.5" /> Template Layout Preview
                </h4>
                <p className="text-xs leading-relaxed italic text-fg/70">&quot;{selectedTemplate?.content}&quot;</p>
              </div>

              {(selectedTemplate?.content?.match(/\{\{\d+\}\}/g) || []).length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <h5 className="text-[9px] font-black text-fg/30 uppercase tracking-widest ml-1">Dynamic values</h5>
                    {selectedIds.size > 1 && (
                      <button
                        type="button"
                        onClick={handleCopyFirstRow}
                        className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-fg transition-colors cursor-pointer bg-transparent border-0"
                      >
                        Copy Variable 1 to all rows
                      </button>
                    )}
                  </div>

                  <div className="bg-glass-input border border-glass-border rounded-3xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-white/5">
                      <thead className="bg-glass-card/85">
                        <tr>
                          <th className="px-4 py-3 text-left text-[9px] font-black text-muted uppercase tracking-widest">Contact</th>
                          {(selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).map((_: any, i: number) => (
                            <th key={i} className="px-4 py-3 text-left text-[9px] font-black text-muted uppercase tracking-widest">Var {i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-transparent">
                        {Array.from(selectedIds).map((cid) => {
                          const contact = contacts.find((c) => c.id === cid);
                          return (
                            <tr key={cid} className="hover:bg-glass-card">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="text-xs font-bold text-fg truncate max-w-[120px]">{contact?.name || contact?.phone_number}</p>
                              </td>
                              {(selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).map((_: any, i: number) => (
                                <td key={i} className="px-2 py-2">
                                  <input
                                    type="text"
                                    placeholder="value..."
                                    value={bulkVars[cid]?.[i + 1] || ''}
                                    onChange={(e) => setBulkVars({
                                      ...bulkVars,
                                      [cid]: { ...(bulkVars[cid] || {}), [i + 1]: e.target.value }
                                    })}
                                    className="w-full bg-glass-input border border-glass-border focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-fg placeholder:text-fg/10 font-sans"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedIds.size > 10 && (
                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start">
                      <p className="text-[10px] text-muted font-semibold leading-relaxed">
                        <span className="font-black uppercase tracking-tight text-indigo-400 mr-1.5">Note:</span>
                        For bulk dispatches over 10 contacts, we recommend using <Link href="/campaigns" className="underline text-fg font-bold hover:text-indigo-400">Campaigns Excel Drops</Link> for unified file parsing.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h5 className="font-black text-fg uppercase tracking-widest text-xs">Awaiting dispatch</h5>
                  <p className="text-xs text-muted mt-1.5">This template layout is static and does not contain variable hooks.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-glass-border bg-glass-card/10 flex justify-between items-center sm:flex-row flex-col gap-4">
          {templateStep === 'VARS' ? (
            <>
              <button
                onClick={() => setTemplateStep('SELECT')}
                className="w-full sm:w-auto px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-fg cursor-pointer transition-colors bg-transparent border-0 outline-none"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full sm:w-auto px-8 py-3.5 bg-fg text-bg hover:opacity-90 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center cursor-pointer border-0 outline-none"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? 'Sending...' : `Send to ${selectedIds.size} Contacts`}
              </button>
            </>
          ) : (
            <p className="text-[9px] font-black text-fg/30 uppercase tracking-widest mx-auto sm:mx-0">Select a template to proceed</p>
          )}
        </div>
      </div>
    </div>
  );
}
