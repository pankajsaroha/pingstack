'use client';

import { useState, useEffect } from 'react';
import { Plus, Send, Activity, X, Search, Loader2 } from 'lucide-react';
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
        // Fetch stats for each campaign
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
      // 1. Create Campaign
      const cRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          template_id: formData.template_id,
          group_id: formData.group_id,
          scheduled_at: isScheduled ? scheduledAt : null
        })
      });
      
      if (!cRes.ok) throw new Error('Failed to create campaign');
      const campaign = await cRes.json();

      // 2. Send Campaign (Only if NOT scheduled)
      if (!isScheduled) {
        const sRes = await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, groupIds: [formData.group_id] })
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your outreach efforts.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white p-10 mt-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <Send className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No campaigns</h3>
            <p className="mt-1 text-sm text-gray-500">Create a campaign to send bulk messages.</p>
          </div>
        ) : (
          campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                    {campaign.scheduled_at && campaign.status === 'draft' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-tighter">
                         Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Template: {campaign.templates?.name || 'Unknown'}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    campaign.status === 'running' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    campaign.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-100' :
                    campaign.status === 'draft' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                    'bg-gray-50 text-gray-600 border border-gray-100'
                  }`}>
                    {campaign.status}
                  </span>
                  {campaign.scheduled_at && campaign.status === 'draft' && (
                     <p className="text-[10px] text-gray-400 mt-1 font-medium">Due: {new Date(campaign.scheduled_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-50 pt-5 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                    <Activity className="mr-1.5 h-3.5 w-3.5" /> Delivery Performance
                  </h4>
                  {planType !== 'starter' && (
                    <button 
                      onClick={() => {
                        setActiveCampaign(campaign);
                        setShowReportModal(true);
                        fetchReportData(campaign.id);
                      }}
                      className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest"
                    >
                       Detailed Report &rarr;
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-1">Sent</p>
                    <p className="text-xl font-black text-gray-900">{campaign.stats?.sent || 0}</p>
                  </div>
                  <div className="bg-blue-50/30 p-3 rounded-2xl border border-blue-100">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-tighter mb-1">Delivered</p>
                    <p className="text-xl font-black text-blue-600">{campaign.stats?.delivered || 0}</p>
                  </div>
                  <div className="bg-green-50/30 p-3 rounded-2xl border border-green-100">
                    <p className="text-[10px] text-green-400 font-black uppercase tracking-tighter mb-1">Read</p>
                    <p className="text-xl font-black text-green-600">{campaign.stats?.read || 0}</p>
                  </div>
                  <div className="bg-red-50/30 p-3 rounded-2xl border border-red-100">
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-tighter mb-1">Failed</p>
                    <p className="text-xl font-black text-red-600">{campaign.stats?.failed || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Create New Campaign</h3>
            <form onSubmit={handleCreateCampaign}>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Campaign Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Summer Sale 2024"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Template</label>
                    <select
                      required
                      className="block w-full rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all"
                      value={formData.template_id}
                      onChange={e => setFormData({ ...formData, template_id: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {templates.filter(t => t.status === 'APPROVED').map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Group</label>
                    <select
                      required
                      className="block w-full rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all"
                      value={formData.group_id}
                      onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input 
                          id="scheduled"
                          type="checkbox"
                          disabled={planType !== 'growth'}
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                        />
                        <label htmlFor="scheduled" className="ml-2 block text-sm font-bold text-gray-900">
                           Schedule for later
                        </label>
                        {planType === 'starter' && (
                           <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded uppercase border border-amber-100">Growth Plan required</span>
                        )}
                      </div>
                   </div>
                   {isScheduled && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <input 
                           type="datetime-local"
                           required
                           className="block w-full rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                           value={scheduledAt}
                           onChange={(e) => setScheduledAt(e.target.value)}
                        />
                         <p className="text-[10px] text-gray-400 mt-2 font-medium">Campaign will be triggered automatically by the engine at the set time.</p>
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
                  className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-black hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {submitting ? 'Sending...' : (isScheduled ? 'Schedule Campaign' : 'Send Campaign Now')}
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

      {/* Detailed Report Modal */}
      {showReportModal && activeCampaign && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
               <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">{activeCampaign.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Detailed Delivery Logs</p>
               </div>
               <button 
                 onClick={() => {
                   setShowReportModal(false);
                   setReportData([]);
                   setReportSearch('');
                 }}
                 className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm"
               >
                  <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <div className="p-6 bg-white border-b border-gray-50">
               <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search contacts..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl text-sm focus:bg-white focus:ring-1 focus:ring-black transition-all"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                    />
                  </div>
                  <button className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">
                     Export CSV
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
               {reportLoading ? (
                 <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Generating detailed logs...</p>
                 </div>
               ) : reportData.length === 0 ? (
                 <div className="text-center py-20 bg-white">
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No detailed logs found yet</p>
                 </div>
               ) : (
                 <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                       <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Last Update</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {reportData
                         .filter(r => 
                           (r.contacts?.name || '').toLowerCase().includes(reportSearch.toLowerCase()) || 
                           (r.phone_number || '').includes(reportSearch)
                         )
                         .map((row, idx) => (
                           <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-900 text-sm">{row.contacts?.name || 'Unknown'}</td>
                              <td className="px-6 py-4 text-xs text-gray-500 font-medium font-mono">{row.phone_number}</td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                   row.status === 'read' ? 'bg-green-100 text-green-700' :
                                   row.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                                   row.status === 'failed' ? 'bg-red-100 text-red-700' :
                                   'bg-gray-100 text-gray-600'
                                 }`}>
                                    {row.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right text-[10px] text-gray-400 font-medium">
                                 {new Date(row.updated_at).toLocaleString()}
                              </td>
                           </tr>
                         ))}
                    </tbody>
                 </table>
               )}
            </div>
            
            <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex justify-end">
               <button 
                 onClick={() => setShowReportModal(false)}
                 className="px-8 py-3 bg-black text-white rounded-2xl font-black text-xs hover:bg-gray-800 shadow-xl transition-all active:scale-95"
               >
                  Close Report
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
