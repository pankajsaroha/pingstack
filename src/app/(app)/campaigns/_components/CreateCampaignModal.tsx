'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Sparkles, FileSpreadsheet, ChevronDown, Check } from 'lucide-react';
import ExcelUploader from './ExcelUploader';

interface CreateCampaignModalProps {
  templates: any[];
  groups: any[];
  planType: string;
  initialGroupId?: string;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (campaignData: {
    name: string;
    template_id: string;
    group_id: string;
    group_ids?: string[];
    scheduled_at: string | null;
    excelData: any[] | null;
    groupVarValues?: Record<string, string> | null;
  }) => Promise<void>;
}

export default function CreateCampaignModal({
  templates,
  groups,
  planType,
  initialGroupId,
  onClose,
  onToast,
  onSaved,
}: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [recipientSource, setRecipientSource] = useState<'GROUPS' | 'EXCEL'>('GROUPS');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initialGroupId && initialGroupId !== 'EXCEL' ? [initialGroupId] : []
  );
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [groupVarValues, setGroupVarValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Active template object
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === templateId);
  }, [templateId, templates]);

  // Extract variables e.g. ["1", "2"] from active template
  const varsDetected: string[] = useMemo(() => {
    if (!activeTemplate?.content) return [];
    const matches = activeTemplate.content.match(/\{\{(\d+)\}\}/g) || [];
    const rawNums = Array.from(new Set(matches.map((m: string) => m.replace(/\D/g, ''))));
    return (rawNums as string[]).sort((a: string, b: string) => Number(a) - Number(b));
  }, [activeTemplate]);

  // Reset variable values when template changes
  useEffect(() => {
    if (varsDetected.length > 0) {
      const initialMap: Record<string, string> = {};
      varsDetected.forEach((num: any, index: number) => {
        initialMap[String(num)] = index === 0 ? '{{name}}' : '';
      });
      setGroupVarValues(initialMap);
    } else {
      setGroupVarValues({});
    }
  }, [varsDetected]);

  const handleVarChange = (varNum: string, val: string) => {
    setGroupVarValues((prev) => ({ ...prev, [varNum]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !templateId) return;

    if (recipientSource === 'GROUPS' && selectedGroupIds.length === 0) {
      onToast('Please select at least one contact group.', 'info');
      return;
    }

    if (recipientSource === 'EXCEL' && (!excelData || excelData.length === 0)) {
      onToast('Please upload a valid CSV or Excel file.', 'error');
      return;
    }

    if (isScheduled && !scheduledAt) {
      onToast('Please select a schedule time.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await onSaved({
        name,
        template_id: templateId,
        group_id: recipientSource === 'GROUPS' ? (selectedGroupIds[0] || '') : 'EXCEL',
        group_ids: recipientSource === 'GROUPS' ? selectedGroupIds : [],
        scheduled_at: isScheduled ? scheduledAt : null,
        excelData: recipientSource === 'EXCEL' ? excelData : null,
        groupVarValues: recipientSource === 'GROUPS' && varsDetected.length > 0 ? groupVarValues : null,
      });
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Failed to create campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTodayDateStr = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-xl w-full p-8 relative my-8 text-left animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer bg-transparent border-0 outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-black text-fg mb-6 tracking-tight">Create Campaign</h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Campaign Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Outreach 2026"
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all font-sans"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Multi-Select Dropdown Component */}
              <div className="relative">
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Recipients Source</label>
                <button
                  type="button"
                  onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
                  className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg flex items-center justify-between text-left"
                >
                  <span className="truncate">
                    {recipientSource === 'EXCEL' ? '📁 Upload File (.csv / .xlsx)' : (
                      selectedGroupIds.length === 0 ? 'Select Contact Group(s)...' :
                      selectedGroupIds.length === 1 ? (groups.find(g => g.id === selectedGroupIds[0])?.name || '1 Group Selected') :
                      `${selectedGroupIds.length} Groups Selected`
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform duration-200 ${groupDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Overlay */}
                {groupDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-bg/95 backdrop-blur-md border border-glass-border rounded-2xl shadow-2xl z-50 p-3 space-y-2 text-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5 px-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">Recipient Options</span>
                      {recipientSource === 'GROUPS' && groups.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedGroupIds.length === groups.length) setSelectedGroupIds([]);
                            else setSelectedGroupIds(groups.map(g => g.id));
                          }}
                          className="text-[9px] font-bold text-indigo-400 hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          {selectedGroupIds.length === groups.length ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {/* Upload File Option */}
                      <div
                        onClick={() => {
                          setRecipientSource('EXCEL');
                          setGroupDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          recipientSource === 'EXCEL' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'hover:bg-white/[0.05] text-fg'
                        }`}
                      >
                        <span className="text-xs font-bold">📁 Upload File (.csv / .xlsx)</span>
                        {recipientSource === 'EXCEL' && <Check className="w-4 h-4 text-indigo-400" />}
                      </div>

                      <div className="border-t border-white/5 my-1" />

                      {/* Contact Groups with Checkboxes */}
                      {groups.length === 0 ? (
                        <p className="text-xs text-muted font-medium p-2">No groups created yet.</p>
                      ) : (
                        groups.map((g) => {
                          const isChecked = recipientSource === 'GROUPS' && selectedGroupIds.includes(g.id);
                          return (
                            <label
                              key={g.id}
                              className="flex items-center space-x-3 p-2.5 hover:bg-white/[0.05] rounded-xl cursor-pointer transition-colors select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setRecipientSource('GROUPS');
                                  if (selectedGroupIds.includes(g.id)) {
                                    setSelectedGroupIds(selectedGroupIds.filter(id => id !== g.id));
                                  } else {
                                    setSelectedGroupIds([...selectedGroupIds, g.id]);
                                  }
                                }}
                                className="h-4 w-4 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
                              />
                              <span className="text-xs font-bold text-fg">{g.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Content Preview Box */}
            {activeTemplate && (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest block mb-1">Selected Template Content</span>
                <p className="text-xs text-fg/80 font-medium leading-relaxed italic">{activeTemplate.content}</p>
              </div>
            )}

            {/* Variable Mapping Section when Groups are Selected & Template has Variables */}
            {varsDetected.length > 0 && recipientSource === 'GROUPS' && (
              <div className="p-5 bg-glass-input border border-glass-border rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="w-4 h-4 text-indigo-400 mr-2" />
                    <span className="text-xs font-black uppercase tracking-wider text-fg">Configure Template Variables</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecipientSource('EXCEL')}
                    className="text-[9px] font-bold text-indigo-400 hover:underline flex items-center bg-transparent border-0 outline-none cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3 h-3 mr-1" />
                    Upload File instead
                  </button>
                </div>

                <p className="text-[10px] text-muted font-medium leading-normal">
                  Provide values for each template variable. Use <code className="bg-fg/10 px-1 py-0.5 rounded text-fg">{"{{name}}"}</code> to dynamically insert each contact&apos;s name.
                </p>

                <div className="space-y-3 pt-2">
                  {varsDetected.map((varNum: any) => (
                    <div key={varNum} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-fg/70">
                          Variable <code className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">{"{{" + varNum + "}}"}</code>
                        </label>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder={`Value for {{${varNum}}} (e.g. {{name}} or 20% OFF)`}
                        className="block w-full bg-bg border border-glass-border rounded-xl px-4 py-2.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all"
                        value={groupVarValues[varNum] || ''}
                        onChange={(e) => handleVarChange(varNum, e.target.value)}
                      />

                      {/* Quick Fill Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleVarChange(varNum, '{{name}}')}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                        >
                          👤 Contact Name ({"{{name}}"})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVarChange(varNum, '{{phone}}')}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                        >
                          📱 Phone ({"{{phone}}"})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVarChange(varNum, getTodayDateStr())}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                        >
                          📅 Today&apos;s Date
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Excel Uploader when EXCEL is selected */}
            {recipientSource === 'EXCEL' && (
              <div className="mt-3">
                <ExcelUploader
                  needsVariables={varsDetected.length > 0}
                  excelData={excelData}
                  onUploaded={setExcelData}
                  onClear={() => setExcelData(null)}
                  onToast={onToast}
                />
              </div>
            )}

            {/* Schedule Section */}
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
              className="px-8 py-3.5 bg-fg text-bg hover:opacity-90 disabled:opacity-40 disabled:text-muted rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer border-0 outline-none"
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
