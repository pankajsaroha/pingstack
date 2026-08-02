'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';

const LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es_ES', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'ar_SA', label: 'Arabic' },
  { code: 'fr_FR', label: 'French' },
  { code: 'de_DE', label: 'German' },
  { code: 'id_ID', label: 'Indonesian' },
];

const SAMPLES = [
  {
    id: 'fee_en',
    label: 'Fee Reminder (English)',
    name: 'school_fee_reminder',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Dear parent, this is a reminder regarding the pending school fee of {{1}} for your ward in {{2}}. Please clear the amount of {{3}} by {{4}} to avoid late charges. Best regards, School Office.'
  },
  {
    id: 'fee_hi',
    label: 'Fee Reminder (Hindi)',
    name: 'school_fee_hindi',
    category: 'UTILITY',
    language: 'hi',
    bodyText: 'नमस्ते, आपके बच्चे की स्कूल फीस {{1}}, {{2}} के लिए लंबित है। कृपया {{3}} की राशि को {{4}} तक जमा करें ताकि विलंब शुल्क से बचा जा सके। धन्यवाद, स्कूल कार्यालय।'
  },
  {
    id: 'fee_mix',
    label: 'Fee Reminder (Hinglish)',
    name: 'school_fee_hinglish',
    category: 'UTILITY',
    language: 'hi',
    bodyText: 'Hello, aapke bache ki school fees {{1}} for {{2}} pending hai. Please {{3}} amount ko {{4}} tak clear karein to avoid late charges. Thank you, School Team.'
  },
  {
    id: 'exam_en',
    label: 'Exam Schedule (English)',
    name: 'exam_schedule_en',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Important: The final examination for {{1}} starts from {{2}}. Please refer to the schedule: {{3}}. Best of luck for your exams! - {{4}} Office.'
  },
  {
    id: 'exam_hi',
    label: 'Exam Schedule (Hindi)',
    name: 'exam_schedule_hi',
    category: 'UTILITY',
    language: 'hi',
    bodyText: 'महत्वपूर्ण: {{1}} की वार्षिक परीक्षा {{2}} से शुरू हो रही है। समय सारणी: {{3}}। आपकी परीक्षाओं के लिए शुभकामनाएँ! - {{4}} कार्यालय।'
  },
  {
    id: 'leave_en',
    label: 'Leave Approval (English)',
    name: 'leave_approval_en',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Dear {{1}}, your leave request for {{2}} to {{3}} has been approved by {{4}}. Have a good day.'
  }
];

interface CreateTemplateModalProps {
  tenant: any;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (formData: {
    name: string;
    language: string;
    category: string;
    bodyText: string;
  }) => Promise<void>;
}

export default function CreateTemplateModal({
  tenant,
  onClose,
  onToast,
  onSaved,
}: CreateTemplateModalProps) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState('UTILITY');
  const [bodyText, setBodyText] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAI(true);
    setAiError(null);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (tenant?.id) {
        headers['x-tenant-id'] = tenant.id;
      }
      const res = await fetch('/api/templates/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setBodyText(data.text);
        setAiPrompt('');
        onToast('Template draft generated successfully!', 'success');
      } else {
        setAiError(data.error || 'AI generation failed');
      }
    } catch (e: any) {
      setAiError(e.message || 'AI request failed');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bodyText) return;

    setSubmitting(true);
    try {
      await onSaved({
        name,
        language,
        category,
        bodyText,
      });
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Failed to submit template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] overflow-y-auto animate-in fade-in duration-200">
      <div className="flex min-h-full items-start justify-center p-4 text-center sm:items-center sm:p-8">
        <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full p-8 relative text-left my-8 sm:my-0 animate-in zoom-in-95 duration-300">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer bg-transparent border-0 outline-none"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center mb-8">
            <div className="w-14 h-14 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center mr-6">
              <X className="w-6 h-6 text-fg hidden" />
              <span className="text-xs font-black uppercase text-fg">WABA</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-fg tracking-tight">Create Meta Template</h3>
              <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Direct Cloud API Submission Pipeline</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Template Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. order_confirmation_alert"
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all font-mono"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  />
                  <p className="text-[9px] text-fg/30 mt-2 px-1 font-semibold">Lower-case letters and underscores only.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Category</label>
                    <select
                      className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="UTILITY" className="bg-bg text-fg">Utility</option>
                      <option value="MARKETING" className="bg-bg text-fg">Marketing</option>
                      <option value="AUTHENTICATION" className="bg-bg text-fg">Authentication</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Language</label>
                    <select
                      className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-bg text-fg">{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {showPresets ? (
                  <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 relative animate-in slide-in-from-top duration-300">
                    <button
                      type="button"
                      onClick={() => setShowPresets(false)}
                      className="absolute top-4 right-4 text-[9px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer bg-transparent border-0 outline-none"
                    >
                      Hide
                    </button>
                    <label className="flex items-center text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3 px-1">
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      Speed Build Samples
                    </label>
                    <select
                      className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                      onChange={(e) => {
                        const sample = SAMPLES.find((s) => s.id === e.target.value);
                        if (sample) {
                          setName(sample.name);
                          setCategory(sample.category);
                          setLanguage(sample.language);
                          setBodyText(sample.bodyText);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled className="text-fg/20">Select a pre-configured template...</option>
                      {SAMPLES.map((sample) => (
                        <option key={sample.id} value={sample.id} className="bg-bg text-fg">{sample.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex justify-end px-1">
                    <button
                      type="button"
                      onClick={() => setShowPresets(true)}
                      className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 hover:underline uppercase tracking-widest cursor-pointer flex items-center gap-1.5 bg-transparent border-0 outline-none"
                    >
                      <Sparkles className="w-3 h-3" />
                      Use a template preset example
                    </button>
                  </div>
                )}

                {/* AI Copilot */}
                <div className="p-5 bg-indigo-500/[0.03] border border-glass-border/60 rounded-[2rem] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-2 animate-pulse text-indigo-400" />
                      AI Copilot Assist
                    </span>
                    {tenant?.plan_type === 'starter' && (
                      <span className="text-[8px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        Upgrade Required
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={tenant?.plan_type === 'starter' ? 'AI generation is locked on Starter plan' : 'Describe the message you want to generate (e.g. order tracking alert)...'}
                      disabled={tenant?.plan_type === 'starter' || generatingAI}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1 bg-glass-input border border-glass-border rounded-xl px-4 py-3 text-xs font-semibold text-fg placeholder:text-fg/20 focus:border-indigo-500 focus:outline-none disabled:opacity-50 font-sans"
                    />
                    <button
                      type="button"
                      disabled={tenant?.plan_type === 'starter' || generatingAI || !aiPrompt.trim()}
                      onClick={handleGenerateAI}
                      className="px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0 cursor-pointer border-0 outline-none"
                    >
                      {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Generate'}
                    </button>
                  </div>
                  {aiError && <p className="text-[10px] text-red-400 font-bold ml-1">{aiError}</p>}
                </div>
              </div>

            </div>

            {/* Content Area */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Body Text Content</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Hi {{1}}, your booking for date {{2}} is confirmed."
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-semibold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all leading-relaxed resize-none"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                />

                <div className="mt-4 flex items-start p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                  <AlertCircle className="w-4 h-4 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted font-bold leading-normal uppercase tracking-wider">
                    Specify dynamic variables as <code className="bg-white/10 px-1 py-0.5 rounded mx-1 text-fg font-mono">{"{{1}}"}</code>, <code className="bg-white/10 px-1 py-0.5 rounded mx-1 text-fg font-mono">{"{{2}}"}</code>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors bg-transparent outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] px-6 py-4 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-40 flex items-center justify-center cursor-pointer border-0 outline-none"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Submit to Meta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
