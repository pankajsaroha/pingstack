'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Send, Activity, X, Search, Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Toast from '@/components/Toast';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', template_id: '', group_id: '' });
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [tenant, setTenant] = useState<any>(null);
  const [planType, setPlanType] = useState('starter');
  
  // Excel State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [needsVariables, setNeedsVariables] = useState(false);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState('');

  useEffect(() => {
    fetchTenant().then((t) => {
      if (t) fetchData();
    });
  }, []);

  const fetchTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me');
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        setPlanType(data.plan_type || 'starter');
        return data;
      }
    } catch (e) {
      console.error('Tenant fetch failed:', e);
    }
  };

  const fetchData = async () => {
    try {
      const [cRes, tRes, gRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/templates'),
        fetch('/api/groups')
      ]);
      const [cData, tData, gData] = await Promise.all([cRes.json(), tRes.json(), gRes.json()]);
      
      if (Array.isArray(cData)) {
        const campaignsWithStats = await Promise.all(cData.map(async (c) => {
          try {
            const sRes = await fetch(`/api/campaigns/${c.id}/status`);
            const sData = await sRes.json();
            return { ...c, stats: sData };
          } catch (e) {
            return { ...c, stats: { sent: 0, delivered: 0, read: 0, failed: 0 } };
          }
        }));
        setCampaigns(campaignsWithStats);
      }
      if (Array.isArray(tData)) setTemplates(tData);
      if (Array.isArray(gData)) setGroups(gData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeTemplate = templates.find(t => t.id === formData.template_id);
    if (activeTemplate) {
      const hasVars = activeTemplate.content && activeTemplate.content.includes('{{1}}');
      setNeedsVariables(hasVars);
      if (hasVars) {
        setFormData(prev => ({ ...prev, group_id: 'EXCEL' }));
      }
    } else {
      setNeedsVariables(false);
    }
  }, [formData.template_id, templates]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const formatted = data.slice(needsVariables ? 0 : 0).map((row: any) => ({
          phone: String(row[0] || '').replace(/[^0-9+]/g, ''),
          variables: row.slice(1)
        })).filter(r => r.phone.length > 5);

        setExcelData(formatted);
      } catch (err) {
        setToast({ message: 'Failed to parse file. Check format.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const fetchReportData = async (campaignId: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/report`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Report fetch failed:', e);
    } finally {
      setReportLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.template_id || !formData.group_id) return;

    if (isScheduled && !scheduledAt) {
      setToast({ message: 'Please select a schedule time.', type: 'info' });
      return;
    }

    setSubmitting(true);
    try {
      const cRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          template_id: formData.template_id,
          group_id: formData.group_id === 'EXCEL' ? null : formData.group_id,
          scheduled_at: isScheduled ? scheduledAt : null
        })
      });
      
      if (!cRes.ok) throw new Error('Failed to create campaign');
      const campaign = await cRes.json();

      if (!isScheduled) {
        const sRes = await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            campaignId: campaign.id, 
            groupIds: formData.group_id === 'EXCEL' ? [] : [formData.group_id],
            directData: excelData
          })
        });

        if (!sRes.ok) {
          const errorData = await sRes.json();
          setToast({ message: 'Error: ' + errorData.error, type: 'error' });
        } else {
          setToast({ message: 'Campaign queued!', type: 'success' });
       }
      } else {
        setToast({ message: 'Campaign scheduled!', type: 'success' });
      }

      setFormData({ name: '', template_id: '', group_id: '' });
      setIsScheduled(false);
      setScheduledAt('');
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      setToast({ message: 'Error: ' + e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header Panel */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Campaigns</h1>
          <p className="text-white/40 text-sm font-semibold mt-1">Manage bulk messaging workflows and logs.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-5 py-3 bg-white text-black hover:bg-neutral-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-white/5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Launch Campaign
        </button>
      </div>

      {/* Campaigns Listing */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20 opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-white mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Loading Campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white/[0.01] border border-white/5 p-12 mt-4 rounded-[2.5rem] text-center shadow-xl">
            <Send className="mx-auto h-12 w-12 text-white/20 mb-4 animate-pulse-slow" />
            <h3 className="text-base font-black text-white mb-1">No Active Campaigns</h3>
            <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">Spawn a new outreach workflow to send bulk WhatsApp messages.</p>
          </div>
        ) : (
          campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white/[0.01] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-black text-white tracking-tight">{campaign.name}</h3>
                    {campaign.scheduled_at && campaign.status === 'draft' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                         Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 font-semibold mt-1">Template: <span className="text-white/60">{campaign.templates?.name || 'Unknown'}</span></p>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    campaign.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    campaign.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    campaign.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-white/5 text-white/55 border border-white/5'
                  }`}>
                    {campaign.status}
                  </span>
                  {campaign.scheduled_at && campaign.status === 'draft' && (
                     <p className="text-[10px] text-white/30 mt-1.5 font-bold">Due: {new Date(campaign.scheduled_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div className="border-t border-white/5 pt-6 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center">
                    <Activity className="mr-2 h-4 w-4 text-indigo-400" /> Delivery Performance
                  </h4>
                  {planType !== 'starter' && (
                    <button 
                      onClick={() => {
                        setActiveCampaign(campaign);
                        setShowReportModal(true);
                        fetchReportData(campaign.id);
                      }}
                      className="text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest transition-all cursor-pointer"
                    >
                       Detailed Logs &rarr;
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-wider mb-1">Sent</p>
                    <p className="text-xl font-black text-white">{campaign.stats?.sent || 0}</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
                    <p className="text-[9px] text-blue-400/90 font-black uppercase tracking-wider mb-1">Delivered</p>
                    <p className="text-xl font-black text-blue-400">{campaign.stats?.delivered || 0}</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                    <p className="text-[9px] text-emerald-400/90 font-black uppercase tracking-wider mb-1">Read</p>
                    <p className="text-xl font-black text-emerald-400">{campaign.stats?.read || 0}</p>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
                    <p className="text-[9px] text-red-400/90 font-black uppercase tracking-wider mb-1">Failed</p>
                    <p className="text-xl font-black text-red-400">{campaign.stats?.failed || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a]/95 border border-white/10 rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-8 right-8 text-white/40 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Spawn Campaign</h3>
            
            <form onSubmit={handleCreateCampaign}>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Summer Outreach 2026"
                    className="block w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none placeholder:text-white/20 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Meta Template</label>
                    <select
                      required
                      className="block w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-white"
                      value={formData.template_id}
                      onChange={e => setFormData({ ...formData, template_id: e.target.value })}
                    >
                      <option value="" className="bg-[#0f0f11] text-white">Select...</option>
                      {templates.filter(t => t.status === 'APPROVED').map(t => (
                        <option key={t.id} value={t.id} className="bg-[#0f0f11] text-white">{t.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Recipients Source</label>
                    {needsVariables ? (
                      <div className="space-y-3">
                         <button 
                           type="button"
                           onClick={() => fileInputRef.current?.click()}
                           className={`w-full py-3.5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                             excelData 
                               ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' 
                               : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                           }`}
                         >
                            {excelData ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{excelData.length} Contacts Shared</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-white/40" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Upload CSV/Excel</span>
                              </>
                            )}
                         </button>
                         
                         <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
                            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1.5 flex items-center">
                               <FileText className="w-3.5 h-3.5 mr-1.5" /> PERSONALIZATION METADATA
                            </p>
                            <p className="text-[10px] text-white/50 font-bold leading-normal">
                               Variables detected. Upload file structure must be:
                            </p>
                            <div className="mt-2 flex items-center space-x-2 text-[8px] font-mono bg-black/60 border border-white/5 p-2 rounded-lg text-indigo-300">
                               <span>Col A: Phone</span>
                               <span className="text-white/20">|</span>
                               <span>Col B: Var 1</span>
                               <span className="text-white/20">|</span>
                               <span>Col C: Var 2...</span>
                            </div>
                         </div>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                      </div>
                    ) : (
                      <select
                        required
                        className="block w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-white"
                        value={formData.group_id}
                        onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                      >
                        <option value="" className="bg-[#0f0f11] text-white">Select...</option>
                        <option value="EXCEL" className="bg-[#0f0f11] text-white">Upload File (.csv/.xlsx)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id} className="bg-[#0f0f11] text-white">{g.name}</option>
                        ))}
                      </select>
                    )}
                    
                    {!needsVariables && formData.group_id === 'EXCEL' && (
                       <div className="mt-3">
                          <button 
                             type="button"
                             onClick={() => fileInputRef.current?.click()}
                             className={`w-full py-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                               excelData 
                                 ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' 
                                 : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                             }`}
                          >
                             {excelData ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Upload className="w-4 h-4 text-white/30" />}
                             <span className="text-[9px] font-black uppercase tracking-widest">
                                {excelData ? `${excelData.length} Contacts Loaded` : 'Select File'}
                             </span>
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                       </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input 
                          id="scheduled"
                          type="checkbox"
                          disabled={planType !== 'growth'}
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="h-4 w-4 bg-white/5 border-white/10 text-black focus:ring-white rounded cursor-pointer"
                        />
                        <label htmlFor="scheduled" className="ml-2 block text-xs font-black uppercase tracking-widest text-white/50 cursor-pointer">
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
                           className="block w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all text-white font-mono"
                           value={scheduledAt}
                           onChange={(e) => setScheduledAt(e.target.value)}
                        />
                         <p className="text-[9px] text-white/30 mt-2 font-medium">Cron engine triggers campaigns automatically at the designated local timezone stamp.</p>
                      </div>
                   )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setIsScheduled(false);
                  }}
                  className="px-6 py-3.5 border border-white/10 hover:bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 bg-white text-black hover:bg-neutral-100 disabled:opacity-40 disabled:text-white/40 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {submitting ? 'Dispatching...' : (isScheduled ? 'Schedule Dispatch' : 'Queue Send Now')}
                </button>
              </div>
            </form>
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

      {/* Detailed Logs Report Modal */}
      {showReportModal && activeCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a]/95 border border-white/10 rounded-[2.5rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh] overflow-hidden relative animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-[#020202]/30">
               <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{activeCampaign.name}</h3>
                  <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-1.5">Delivery Status Metrics Logs</p>
               </div>
               <button 
                 onClick={() => {
                   setShowReportModal(false);
                   setReportData([]);
                   setReportSearch('');
                 }}
                 className="p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-white/40 hover:text-white"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="p-6 bg-black/40 border-b border-white/5">
               <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text"
                      placeholder="Search recipients name or phone..."
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-semibold focus:bg-white/10 focus:border-indigo-500 focus:outline-none transition-all text-white placeholder:text-white/25"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                    />
                  </div>
                  <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer">
                     Export CSV
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {reportLoading ? (
                 <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Compiling statistics...</p>
                 </div>
               ) : reportData.length === 0 ? (
                 <div className="text-center py-20 opacity-40">
                    <p className="text-xs font-black uppercase tracking-widest">No logs recorded yet</p>
                 </div>
               ) : (
                 <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0c0c0e] border-b border-white/5 z-10">
                       <tr>
                          <th className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest">Recipient</th>
                          <th className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest">Phone</th>
                          <th className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest">Variables</th>
                          <th className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">Status</th>
                          <th className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest text-right">Timestamp</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {reportData
                         .filter(r => 
                           (r.contacts?.name || '').toLowerCase().includes(reportSearch.toLowerCase()) || 
                           (r.phone_number || '').includes(reportSearch)
                         )
                         .map((row, idx) => (
                           <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-bold text-white text-sm">
                                 {row.contacts?.name || (row.variables?.length > 0 ? (row.variables[0] || 'Unknown') : 'Customer')}
                              </td>
                              <td className="px-6 py-4 text-xs text-white/50 font-semibold font-mono">{row.phone_number}</td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-wrap gap-1.5">
                                    {row.variables?.map((v: any, i: number) => (
                                       <span key={i} className="px-2 py-0.5 bg-white/5 text-white/50 rounded-lg text-[8px] font-black uppercase border border-white/5">
                                          v{i+1}: {v}
                                       </span>
                                    ))}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                   row.status === 'read' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                   row.status === 'delivered' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                   row.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                   'bg-white/5 border-white/5 text-white/50'
                                 }`}>
                                    {row.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right text-[10px] text-white/30 font-semibold font-mono">
                                 {new Date(row.created_at).toLocaleString()}
                              </td>
                           </tr>
                         ))}
                    </tbody>
                 </table>
               )}
            </div>
            
            <div className="p-6 border-t border-white/5 bg-[#020202]/30 flex justify-end">
               <button 
                 onClick={() => setShowReportModal(false)}
                 className="px-6 py-3 bg-white text-black hover:bg-neutral-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg"
               >
                  Close Logs
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
