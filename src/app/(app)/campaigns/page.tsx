'use client';

import { useState, useEffect } from 'react';
import { Plus, Send, Activity } from 'lucide-react';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', template_id: '', group_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

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
          const sRes = await fetch(`/api/campaigns/${c.id}/status`);
          const sData = await sRes.json();
          return { ...c, stats: sData };
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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.template_id || !formData.group_id) return;

    try {
      // 1. Create Campaign
      const cRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, template_id: formData.template_id })
      });
      
      if (!cRes.ok) throw new Error('Failed to create campaign');
      const campaign = await cRes.json();

      // 2. Send Campaign
      const sRes = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, groupIds: [formData.group_id] })
      });

      if (sRes.ok) {
        setFormData({ name: '', template_id: '', group_id: '' });
        setShowModal(false);
        fetchData();
      } else {
        const errorData = await sRes.json();
        alert('Error: ' + errorData.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campaigns</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
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
            <div key={campaign.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-500">Template: {campaign.templates?.name || 'Unknown'}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {campaign.status}
                </span>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <Activity className="mr-1.5 h-3.5 w-3.5" /> Delivery Status
                </h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Sent</p>
                    <p className="text-xl font-semibold text-gray-900">{campaign.stats?.sent || 0}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Delivered</p>
                    <p className="text-xl font-semibold text-blue-900">{campaign.stats?.delivered || 0}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 mb-1">Read</p>
                    <p className="text-xl font-semibold text-green-900">{campaign.stats?.read || 0}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <p className="text-xs text-red-600 mb-1">Failed</p>
                    <p className="text-xl font-semibold text-red-900">{campaign.stats?.failed || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Campaign</h3>
            <form onSubmit={handleCreateCampaign}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
                  <select
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                    value={formData.template_id}
                    onChange={e => setFormData({ ...formData, template_id: e.target.value })}
                  >
                    <option value="">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Group</label>
                  <select
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                    value={formData.group_id}
                    onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                  >
                    <option value="">Select a group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800"
                >
                  Send Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
