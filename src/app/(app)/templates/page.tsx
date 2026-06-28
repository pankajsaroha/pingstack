'use client';

import { useState, useEffect } from 'react';
import { Plus, LayoutTemplate, Trash2, Globe, Tag, RefreshCw, Loader2, AlertCircle, X, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
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

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    language: 'en_US', 
    category: 'UTILITY', 
    bodyText: '' 
  });
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [portfolioId, setPortfolioId] = useState('');
  const [troubleshootTab, setTroubleshootTab] = useState<'new_account' | 'permissions'>('new_account');
  const [tenant, setTenant] = useState<any>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me');
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        fetchTemplates();
      }
    } catch (e) {
      console.error('Tenant fetch failed:', e);
    }
  };

  const fetchTemplates = async (sync = false) => {
    if (sync) setSyncing(true);
    try {
      const url = sync ? '/api/whatsapp/meta/templates' : '/api/templates';
      const headers: any = { 'Content-Type': 'application/json' };
      
      if (sync && tenant?.id) {
        headers['x-tenant-id'] = tenant.id;
      }
      
      const res = await fetch(url, { 
        credentials: 'include',
        headers: sync ? headers : undefined
      });
      const data = await res.json();
      if (res.ok) {
        if (sync) {
          const syncTemplates = data.templates || [];
          setTemplates(syncTemplates);
          setPortfolioId(data.portfolioId);
          if (syncTemplates.length > 0) {
            setToast({ message: 'Templates synchronized with Meta', type: 'success' });
          } else {
            setShowTroubleshoot(true);
          }
        } else {
          if (Array.isArray(data)) setTemplates(data);
        }
      } else {
        setToast({ message: data.error || 'Failed to sync templates', type: 'error' });
      }
    } catch (e: any) {
      console.error(e);
      setToast({ message: 'Network error: ' + e.message, type: 'error' });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.bodyText) return;

    setSyncing(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (tenant?.id) {
        headers['x-tenant-id'] = tenant.id;
      }
      
      const res = await fetch('/api/whatsapp/meta/templates', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setToast({ message: 'Template submitted to Meta', type: 'success' });
        setFormData({ name: '', language: 'en_US', category: 'UTILITY', bodyText: '' });
        setShowModal(false);
        fetchTemplates(true);
      } else {
        const err = await res.json();
        const msg = err.dbError 
          ? `${err.error}. Database Error: ${err.dbError.message || 'Check logs'}`
          : err.error || 'Failed to create template';
        setToast({ message: msg, type: 'error' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} template(s)?`)) return;

    try {
      const res = await fetch('/api/templates', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setToast({ message: 'Templates deleted', type: 'success' });
        fetchTemplates();
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + data.error, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error: ' + err.message, type: 'error' });
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div>
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg">Message Templates</h1>
          <p className="text-muted text-sm font-semibold mt-1">Design and sync rich templates directly with Meta WhatsApp systems.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <button 
            onClick={() => fetchTemplates(true)}
            disabled={syncing}
            className="flex items-center px-5 py-3 bg-glass-input border border-glass-border rounded-2xl text-xs font-black uppercase tracking-widest text-fg hover:bg-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
            Sync with Meta
          </button>
          
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center px-5 py-3 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-widest text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Templates Catalog */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20 opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-fg mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Loading Catalog...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-glass-card border border-glass-border p-12 mt-4 rounded-[2.5rem] text-center shadow-xl">
            <LayoutTemplate className="mx-auto h-12 w-12 text-fg/20 mb-4 animate-pulse-slow" />
            <h3 className="text-base font-black text-fg mb-1">No Active Templates</h3>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">Pull templates from Meta cloud sync, or build your first template draft here.</p>
          </div>
        ) : (
          templates.map(template => (
            <div 
              key={template.id} 
              className={`bg-glass-card border p-6 rounded-[2.5rem] relative shadow-2xl hover:border-glass-border hover:bg-glass-card transition-all duration-300 cursor-pointer ${
                selectedIds.has(template.id) ? 'border-white ring-1 ring-white/10 bg-glass-card' : 'border-glass-border'
              }`}
              onClick={(e) => toggleSelection(template.id, e)}
            >
              <div className="absolute top-6 right-6 z-30">
                <input
                  type="checkbox"
                  checked={selectedIds.has(template.id)}
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
          ))
        )}
      </div>

      {/* Sync Failure Troubleshooter Modal */}
      {showTroubleshoot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-xl w-full p-8 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowTroubleshoot(false)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center mb-6">
              <div className="w-14 h-14 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center mr-6">
                 <LayoutTemplate className="w-6 h-6 text-fg" />
              </div>
              <div>
                <h3 className="text-xl font-black text-fg tracking-tight leading-none">Sync Finished Empty</h3>
                <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Meta API returned 0 matching templates</p>
              </div>
            </div>

            {/* Selector Tabs */}
            <div className="flex bg-glass-input p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setTroubleshootTab('new_account')}
                className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                  troubleshootTab === 'new_account' 
                    ? 'bg-fg text-bg shadow-md' 
                    : 'text-muted hover:text-fg'
                }`}
              >
                Brand New Account
              </button>
              <button
                type="button"
                onClick={() => setTroubleshootTab('permissions')}
                className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                  troubleshootTab === 'permissions' 
                    ? 'bg-fg text-bg shadow-md' 
                    : 'text-muted hover:text-fg'
                }`}
              >
                Permissions Check
              </button>
            </div>

            {troubleshootTab === 'new_account' ? (
              <div className="space-y-6">
                <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/10">
                  <p className="text-xs text-fg/60 font-semibold leading-relaxed">
                    If this is a new WhatsApp Business Account, it is completely normal to have no templates. Submit and approve at least one layout on Meta to run sync successfully.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest px-1">Actions</p>
                  
                  <div 
                    onClick={() => { setShowTroubleshoot(false); setShowModal(true); }}
                    className="flex items-center p-4 bg-glass-input hover:bg-white/10 rounded-2xl border border-glass-border cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mr-4">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-fg uppercase tracking-wider">Create Template Here</h4>
                      <p className="text-[10px] text-muted mt-1 font-semibold">Submit a utility layout directly to Meta from PingStack.</p>
                    </div>
                  </div>

                  <a 
                    href="https://business.facebook.com/wa/manage/templates"
                    target="_blank"
                    className="flex items-center p-4 bg-glass-input hover:bg-white/10 rounded-2xl border border-glass-border cursor-pointer transition-all active:scale-[0.99] group block"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mr-4">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-fg uppercase tracking-wider flex items-center">
                        <span>Meta WhatsApp Manager</span>
                        <ExternalLink className="w-3 h-3 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[10px] text-muted mt-1 font-semibold">Create and configure templates inside WhatsApp Manager Console.</p>
                    </div>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
                  <p className="text-xs text-fg/60 font-semibold leading-relaxed">
                    Verify that your <b>System User</b> credentials have permission assigned to link and discover templates on this specific asset.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest px-1">How to fix permissions:</p>
                  <ul className="space-y-3">
                    {[
                      { step: 1, text: 'Open Meta Business Suite settings and look under WhatsApp Accounts.' },
                      { step: 2, text: 'Click "People" and select your linked System User profile.' },
                      { step: 3, text: 'Ensure the "Manage WhatsApp Account" slider is set to Active.' }
                    ].map(item => (
                      <li key={item.step} className="flex gap-4 items-start bg-glass-input p-4 rounded-2xl border border-glass-border">
                        <span className="w-6 h-6 rounded-full bg-fg text-bg flex items-center justify-center text-[10px] font-black shrink-0">{item.step}</span>
                        <span className="text-xs text-fg/50 font-bold leading-normal">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a 
                  href={`https://business.facebook.com/latest/settings/whatsapp_account?business_id=${portfolioId}`}
                  target="_blank"
                  className="w-full py-4 bg-fg text-bg rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-neutral-100 transition-all text-center flex items-center justify-center space-x-2"
                >
                  <span>Verify Meta Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] overflow-y-auto animate-in fade-in duration-200">
          <div className="flex min-h-full items-start justify-center p-4 text-center sm:items-center sm:p-8">
            <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-xl w-full p-8 relative text-left my-8 sm:my-0 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center mb-8">
              <div className="w-14 h-14 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center mr-6">
                 <LayoutTemplate className="w-6 h-6 text-fg" />
              </div>
              <div>
                <h3 className="text-xl font-black text-fg tracking-tight">Create Meta Template</h3>
                <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Direct Cloud API Submission Pipeline</p>
              </div>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="space-y-6 mb-8">
                <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                  <label className="flex items-center text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3 px-1">
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Speed Build Samples
                  </label>
                  <select
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    onChange={(e) => {
                      const sample = SAMPLES.find(s => s.id === e.target.value);
                      if (sample) {
                        setFormData({
                          name: sample.name,
                          category: sample.category,
                          language: sample.language,
                          bodyText: sample.bodyText
                        });
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled className="text-fg/20">Select a pre-configured template...</option>
                    {SAMPLES.map(sample => (
                      <option key={sample.id} value={sample.id} className="bg-[#0f0f11] text-fg">{sample.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Template Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. order_confirmation_alert"
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all font-mono"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  />
                  <p className="text-[9px] text-fg/30 mt-2 px-1 font-semibold">Lower-case letters and underscores only.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Category</label>
                    <select
                      className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="UTILITY" className="bg-[#0f0f11] text-fg">Utility</option>
                      <option value="MARKETING" className="bg-[#0f0f11] text-fg">Marketing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Language</label>
                    <select
                      className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                      value={formData.language}
                      onChange={e => setFormData({ ...formData, language: e.target.value })}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code} className="bg-[#0f0f11] text-fg">{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Body Text Content</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Hi {{1}}, your booking for date {{2}} is confirmed."
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-semibold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all leading-relaxed resize-none"
                    value={formData.bodyText}
                    onChange={e => setFormData({ ...formData, bodyText: e.target.value })}
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
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-[2] px-6 py-4 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Submit to Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {toast && (
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(null)} 
      />
    )}
    </div>
  );
}
