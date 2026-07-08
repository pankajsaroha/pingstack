'use client';

import { useState, lazy, Suspense } from 'react';
import { Plus, Send, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import CampaignCard from './CampaignCard';

const CreateCampaignModal = lazy(() => import('./CreateCampaignModal'));
const CampaignReport = lazy(() => import('./CampaignReport'));

interface CampaignsClientProps {
  tenant: any;
  planType: string;
  initialCampaigns: any[];
  initialTemplates: any[];
  initialGroups: any[];
}

export default function CampaignsClient({
  tenant,
  planType,
  initialCampaigns,
  initialTemplates,
  initialGroups,
}: CampaignsClientProps) {
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [templates] = useState<any[]>(initialTemplates);
  const [groups] = useState<any[]>(initialGroups);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavedCampaign = async (campaignData: {
    name: string;
    template_id: string;
    group_id: string;
    scheduled_at: string | null;
    excelData: any[] | null;
  }) => {
    const cRes = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaignData.name,
        template_id: campaignData.template_id,
        group_id: campaignData.group_id === 'EXCEL' ? null : campaignData.group_id,
        scheduled_at: campaignData.scheduled_at
      })
    });

    if (!cRes.ok) throw new Error('Failed to create campaign');
    const campaign = await cRes.json();

    if (!campaignData.scheduled_at) {
      const sRes = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          groupIds: campaignData.group_id === 'EXCEL' ? [] : [campaignData.group_id],
          directData: campaignData.excelData
        })
      });

      if (!sRes.ok) {
        const errorData = await sRes.json();
        fireToast('Error: ' + errorData.error, 'error');
      } else {
        fireToast('Campaign queued!', 'success');
      }
    } else {
      fireToast('Campaign scheduled!', 'success');
    }

    await fetchCampaigns();
  };

  const handleViewReport = (campaign: any) => {
    setActiveCampaign(campaign);
    setShowReportModal(true);
  };

  return (
    <div>
      {/* Header Panel */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg text-left">Campaigns</h1>
          <p className="text-muted text-sm font-semibold mt-1">Manage bulk messaging workflows and logs.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-5 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-white/5 border-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Launch Campaign
        </button>
      </div>

      {/* Campaigns Listing */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20 opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-fg mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Loading Campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-glass-card border border-glass-border p-12 mt-4 rounded-[2.5rem] text-center shadow-xl">
            <Send className="mx-auto h-12 w-12 text-fg/20 mb-4 animate-pulse-slow" />
            <h3 className="text-base font-black text-fg mb-1">No Active Campaigns</h3>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">Create a new outreach workflow to send bulk WhatsApp messages.</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              planType={planType}
              onViewReport={handleViewReport}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <CreateCampaignModal
            templates={templates}
            groups={groups}
            planType={planType}
            onClose={() => setShowModal(false)}
            onToast={fireToast}
            onSaved={handleSavedCampaign}
          />
        </Suspense>
      )}

      {/* Detailed Logs Report Modal */}
      {showReportModal && activeCampaign && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <CampaignReport
            campaign={activeCampaign}
            onClose={() => {
              setShowReportModal(false);
              setActiveCampaign(null);
            }}
          />
        </Suspense>
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
