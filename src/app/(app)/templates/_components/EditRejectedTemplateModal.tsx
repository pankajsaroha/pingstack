'use client';

import { useState } from 'react';
import { X, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface EditRejectedTemplateModalProps {
  template: any;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onResubmit: (formData: {
    oldTemplateId: string;
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
  const getNextVersionName = (baseName: string) => {
    if (!baseName) return '';
    const match = baseName.match(/^(.*)_v(\d+)$/);
    if (match) {
      const prefix = match[1];
      const version = parseInt(match[2], 10) + 1;
      return `${prefix}_v${version}`;
    }
    return `${baseName}_v2`;
  };

  const [name, setName] = useState(getNextVersionName(template.name));
  const [language, setLanguage] = useState(template.language || 'en_US');
  const [category, setCategory] = useState(template.category || 'UTILITY');
  const [bodyText, setBodyText] = useState(template.content || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !bodyText.trim()) {
      onToast('Template name and body text are required.', 'info');
      return;
    }

    let finalName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // If user kept the exact old name, automatically append _v2 and inform user
    if (finalName === String(template.name).trim().toLowerCase()) {
      finalName = `${finalName}_v2`;
      onToast(`Meta requires a new name. Automatically updated name to "${finalName}".`, 'info');
    }

    setSubmitting(true);
    try {
      await onResubmit({
        oldTemplateId: template.id,
        name: finalName,
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

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">Edit & Resubmit Template</h3>
            <p className="text-[11px] text-muted font-medium">Modify template ({template.status || 'PENDING'}) and resubmit for Meta approval</p>
          </div>
        </div>

        {/* Informational Banner with High-Contrast Indigo Styling */}
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl mb-6 text-left shadow-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-fg font-semibold leading-relaxed">
              <strong className="font-black text-indigo-400 block mb-1 text-sm tracking-wide">Meta WABA Resubmission Policy:</strong>
              Submitting this edit will automatically delete your previous template (<span className="font-mono font-extrabold text-indigo-400">&quot;{template.name}&quot;</span>) from Meta Cloud API and submit your updated template for fresh review.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 mb-8 text-left">
            <div>
              <label className="block text-[10px] font-black text-fg/50 uppercase tracking-widest mb-2 px-1">
                New Template Name (snake_case)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. promo_discount_v2"
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none font-mono"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-fg/80 font-medium mt-2.5 px-1 leading-relaxed">
                💡 <strong className="text-cyan-400">Meta Requirement:</strong> Meta blocks reusing the exact same name immediately after rejection. We pre-added <span className="font-mono font-extrabold text-cyan-400">&quot;_v2&quot;</span> to your template name.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-4 py-4 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="en_US" className="bg-bg text-fg">English (US)</option>
                  <option value="hi" className="bg-bg text-fg">Hindi (hi)</option>
                  <option value="es" className="bg-bg text-fg">Spanish (es)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-4 py-4 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="UTILITY" className="bg-bg text-fg">UTILITY</option>
                  <option value="MARKETING" className="bg-bg text-fg">MARKETING</option>
                  <option value="AUTHENTICATION" className="bg-bg text-fg">AUTHENTICATION</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">
                Body Content (Use {"{{1}}"}, {"{{2}}"} for variables)
              </label>
              <textarea
                required
                rows={4}
                placeholder="Dear {{1}}, your order {{2}} has been confirmed."
                className="block w-full bg-glass-input border border-glass-border rounded-2xl p-5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none font-mono leading-relaxed"
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
              {submitting ? 'Deleting & Resubmitting...' : 'Delete Old & Resubmit Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
