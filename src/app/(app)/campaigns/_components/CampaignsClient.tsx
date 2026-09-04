'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Plus, Send, Loader2, ChevronDown } from 'lucide-react';
import Toast from '@/components/Toast';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCampaigns.length === 50);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [initialGroupId, setInitialGroupId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const gid = params.get('groupId');
      if (gid) {
        setInitialGroupId(gid);
        setShowModal(true);
      }
    }
  }, []);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  // Reload page 1 (used after creating a new campaign)
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns?page=1');
      if (res.ok) {
        const json = await res.json();
        // Handle both paginated shape { data, hasMore } and legacy flat array
        const data = Array.isArray(json) ? json : (json.data || []);
        setCampaigns(data);
        setCurrentPage(1);
        setHasMore(!Array.isArray(json) ? json.hasMore : false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load the next page and append results
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await fetch(`/api/campaigns?page=${nextPage}`);
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : (json.data || []);
        setCampaigns(prev => [...prev, ...data]);
        setCurrentPage(nextPage);
        setHasMore(!Array.isArray(json) ? json.hasMore : false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSavedCampaign = async (campaignData: {
    name: string;
    template_id: string;
    group_id: string;
    group_ids?: string[];
    scheduled_at: string | null;
    excelData: any[] | null;
    groupVarValues?: Record<string, string> | null;
  }) => {
    const targetGroupIds = campaignData.group_ids && campaignData.group_ids.length > 0
      ? campaignData.group_ids
      : (campaignData.group_id === 'EXCEL' ? [] : [campaignData.group_id]);

    const cRes = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaignData.name,
        template_id: campaignData.template_id,
        group_id: targetGroupIds[0] || null,
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
          groupIds: targetGroupIds,
          directData: campaignData.excelData,
          templateVariables: campaignData.groupVarValues || undefined
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

  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [deleteCampaignMessages, setDeleteCampaignMessages] = useState<boolean>(false);

  const handleRetryCampaignFailed = async (campaignId: string) => {
    setRetryingIds(prev => new Set(prev).add(campaignId));
    try {
      const res = await fetch('/api/messages/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ campaignId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fireToast(`Retrying ${data.retriedCount || 0} failed message(s)...`, 'success');
        await fetchCampaigns();
      } else {
        fireToast(data.error || 'Failed to retry campaign messages', 'error');
      }
    } catch (e: any) {
      fireToast(e.message || 'Retry request failed', 'error');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    const campaignId = campaignToDelete.id;
    setDeletingIds(prev => new Set(prev).add(campaignId));
    try {
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ id: campaignId, deleteMessages: deleteCampaignMessages })
      });
      if (res.ok) {
        fireToast(
          deleteCampaignMessages
            ? 'Campaign and all associated message records deleted.'
            : 'Campaign removed from history. Individual chat records preserved.',
          'success'
        );
        setCampaignToDelete(null);
        setDeleteCampaignMessages(false);
        await fetchCampaigns();
      } else {
        const data = await res.json();
        fireToast(data.error || 'Failed to delete campaign', 'error');
      }
    } catch (e: any) {
      fireToast(e.message || 'Delete request failed', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  };

  const handleViewReport = (campaign: any) => {
    setActiveCampaign(campaign);
    setShowReportModal(true);
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Broadcast Campaigns</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Manage bulk messaging workflows, real-time dispatching, and delivery logs.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Launch Campaign</span>
        </button>
      </div>

      {/* Campaigns Listing */}
      <div className="grid grid-cols-1 gap-3.5">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-zinc-500 font-mono">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Send className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Campaigns Launched Yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed">
              Launch targeted WhatsApp broadcast campaigns to engage audience segments with real-time delivery logs.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              + Launch First Campaign
            </button>
          </div>
        ) : (
          <>
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                planType={planType}
                isRetrying={retryingIds.has(campaign.id)}
                isDeleting={deletingIds.has(campaign.id)}
                onViewReport={handleViewReport}
                onRetryFailed={handleRetryCampaignFailed}
                onDeleteCampaign={(cId) => setCampaignToDelete(campaigns.find(c => c.id === cId))}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-40 shadow-2xs"
                >
                  {loadingMore
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
                    : <><ChevronDown className="w-3.5 h-3.5" /> Load More</>
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Luxury Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!campaignToDelete}
        title="Delete Campaign"
        description={`Are you sure you want to remove campaign "${campaignToDelete?.name || ''}" from your campaign history?`}
        checkboxLabel="Delete all individual message logs associated with this campaign as well"
        checkboxChecked={deleteCampaignMessages}
        onCheckboxChange={setDeleteCampaignMessages}
        confirmText="Delete Campaign"
        isDeleting={deletingIds.has(campaignToDelete?.id)}
        onConfirm={confirmDeleteCampaign}
        onClose={() => {
          setCampaignToDelete(null);
          setDeleteCampaignMessages(false);
        }}
      />

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
            initialGroupId={initialGroupId}
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
