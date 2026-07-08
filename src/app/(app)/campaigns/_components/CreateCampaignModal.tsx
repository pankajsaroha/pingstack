'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import ExcelUploader from './ExcelUploader';

interface CreateCampaignModalProps {
  templates: any[];
  groups: any[];
  planType: string;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (campaignData: {
    name: string;
    template_id: string;
    group_id: string;
    scheduled_at: string | null;
    excelData: any[] | null;
  }) => Promise<void>;
}

export default function CreateCampaignModal({
  templates,
  groups,
  planType,
  onClose,
  onToast,
  onSaved,
}: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [needsVariables, setNeedsVariables] = useState(false);
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const activeTemplate = templates.find((t) => t.id === templateId);
    if (activeTemplate) {
      const hasVars = activeTemplate.content && activeTemplate.content.includes('{{1}}');
      setNeedsVariables(hasVars);
      if (hasVars) {
        setGroupId('EXCEL');
      }
    } else {
      setNeedsVariables(false);
    }
  }, [templateId, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !templateId || !groupId) return;

    if (isScheduled && !scheduledAt) {
      onToast('Please select a schedule time.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await onSaved({
        name,
        template_id: templateId,
        group_id: groupId,
        scheduled_at: isScheduled ? scheduledAt : null,
        excelData: groupId === 'EXCEL' ? excelData : null,
      });
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Failed to create campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-black text-fg mb-6 tracking-tight text-left">Create Campaign</h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 mb-8 text-left">
            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Campaign Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Outreach 2026"
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Meta Template</label>
                <select
                  required
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="" className="bg-bg text-fg">Select...</option>
                  {templates.filter((t) => t.status === 'APPROVED').map((t) => (
                    <option key={t.id} value={t.id} className="bg-bg text-fg">{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Recipients Source</label>
                {needsVariables ? (
                  <ExcelUploader
                    needsVariables={needsVariables}
                    excelData={excelData}
                    onUploaded={setExcelData}
                    onClear={() => setExcelData(null)}
                    onToast={onToast}
                  />
                ) : (
                  <select
                    required
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
                    <option value="" className="bg-bg text-fg">Select...</option>
                    <option value="EXCEL" className="bg-bg text-fg">Upload File (.csv/.xlsx)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-bg text-fg">{g.name}</option>
                    ))}
                  </select>
                )}

                {!needsVariables && groupId === 'EXCEL' && (
                  <div className="mt-3">
                    <ExcelUploader
                      needsVariables={needsVariables}
                      excelData={excelData}
                      onUploaded={setExcelData}
                      onClear={() => setExcelData(null)}
                      onToast={onToast}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-glass-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <input
                    id="scheduled"
                    type="checkbox"
                    disabled={planType !== 'growth'}
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 bg-glass-input border-glass-border text-black focus:ring-white rounded cursor-pointer"
                  />
                  <label htmlFor="scheduled" className="ml-2 block text-xs font-black uppercase tracking-widest text-fg/50 cursor-pointer">
                    Schedule Dispatch
                  </label>
                  {planType === 'starter' && (
                    <span className="ml-3 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-black rounded uppercase">Growth Required</span>
                  )}
                </div>
              </div>
              {isScheduled && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3">
                  <input
                    type="datetime-local"
                    required
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all text-fg font-mono"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-[9px] text-fg/30 mt-2 font-medium">Cron engine triggers campaigns automatically at the designated local timezone stamp.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-xs font-black uppercase tracking-widest text-muted hover:text-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-fg text-bg hover:opacity-90 disabled:opacity-40 disabled:text-muted rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? 'Dispatching...' : (isScheduled ? 'Schedule Dispatch' : 'Queue Send Now')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
