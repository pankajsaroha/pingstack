'use client';

import { useState } from 'react';
import { X, Loader2, AlertCircle, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { parseMetaRejectionReason } from '@/lib/templates';

interface EditRejectedTemplateModalProps {
  template: any;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onResubmit: (formData: {
    templateId: string;
    oldTemplateId?: string;
    name: string;
    language: string;
    category: string;
    bodyText: string;
  }) => Promise<void>;
}

export default function EditRejectedTemplateModal({
  template,
  onClose,
  onToast,
  onResubmit,
}: EditRejectedTemplateModalProps) {
  const [language, setLanguage] = useState(template.language || 'en_US');
  const [category, setCategory] = useState(template.category || 'UTILITY');
  const [bodyText, setBodyText] = useState(template.content || '');
  const [submitting, setSubmitting] = useState(false);

  const rawRejectionReason = template.metadata?.rejected_reason || 
    template.metadata?.rejection_reason_code || 
    template.rejected_reason;

  const rejectionInfo = parseMetaRejectionReason(rawRejectionReason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyText.trim()) {
      onToast('Template body text cannot be empty.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await onResubmit({
        templateId: template.id,
        oldTemplateId: template.id,
        name: template.name,
        language,
        category,
        bodyText: bodyText.trim(),
      });
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Failed to resubmit template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 relative my-8 text-left animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">Edit &amp; Resubmit Template</h3>
            <p className="text-[11px] text-muted font-medium">Update this template and resubmit it to Meta for review.</p>
          </div>
        </div>

        {/* Informational Rejection Diagnostics Banner */}
        {template.status === 'REJECTED' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl mb-6 text-left shadow-xs">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-fg font-medium leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <strong className="font-bold text-rose-600 dark:text-rose-400">Meta Rejection Reason:</strong>
                  {rejectionInfo.code && rejectionInfo.code !== 'NOT_SPECIFIED' && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      {rejectionInfo.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-1">{rejectionInfo.reason}</p>
                {rejectionInfo.suggestedFix && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                    💡 <strong>Suggested fix:</strong> {rejectionInfo.suggestedFix}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 mb-8 text-left">
            <div>
              <label className="block text-[10px] font-black text-fg/50 uppercase tracking-widest mb-2 px-1">
                Template Identifier
              </label>
              <div className="flex items-center justify-between bg-glass-input/60 border border-glass-border/70 rounded-2xl px-5 py-3.5 text-xs font-bold text-fg font-mono">
                <span>{template.name}</span>
                <span className="text-[10px] font-mono text-zinc-400 font-normal select-all">
                  ID: {template.template_id || 'Pending Sync'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 px-1">
                Meta in-place update will modify this existing template directly without changing its identifier.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-4 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="en_US" className="bg-bg text-fg">English (US)</option>
                  <option value="en_GB" className="bg-bg text-fg">English (UK)</option>
                  <option value="hi" className="bg-bg text-fg">Hindi (hi)</option>
                  <option value="es_ES" className="bg-bg text-fg">Spanish (es)</option>
                  <option value="pt_BR" className="bg-bg text-fg">Portuguese (pt)</option>
                  <option value="ar_SA" className="bg-bg text-fg">Arabic (ar)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-4 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="UTILITY" className="bg-bg text-fg">UTILITY</option>
                  <option value="MARKETING" className="bg-bg text-fg">MARKETING</option>
                  <option value="AUTHENTICATION" className="bg-bg text-fg">AUTHENTICATION</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">
                Body Content (Variables formatted as {"{{1}}"}, {"{{2}}"})
              </label>
              <textarea
                required
                rows={5}
                placeholder="Dear {{1}}, your order {{2}} has been confirmed."
                className="block w-full bg-glass-input border border-glass-border rounded-2xl p-5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none font-mono leading-relaxed resize-none"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center border-0 outline-none"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? 'Resubmitting to Meta...' : 'Save & Resubmit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

