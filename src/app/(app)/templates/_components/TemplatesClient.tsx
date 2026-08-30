'use client';

import { useState, lazy, Suspense } from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import SyncPanel from './SyncPanel';
import TemplateCard from './TemplateCard';

const CreateTemplateModal = lazy(() => import('./CreateTemplateModal'));
const TroubleshootModal = lazy(() => import('./TroubleshootModal'));
const EditRejectedTemplateModal = lazy(() => import('./EditRejectedTemplateModal'));

interface TemplatesClientProps {
  tenant: any;
  initialTemplates: any[];
}

export default function TemplatesClient({ tenant, initialTemplates }: TemplatesClientProps) {
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRejectedTemplate, setEditingRejectedTemplate] = useState<any | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [portfolioId, setPortfolioId] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const fetchTemplates = async (sync = false) => {
    if (sync) setSyncing(true);
    else setLoading(true);
    try {
      const url = sync ? '/api/whatsapp/meta/templates' : '/api/templates?status=all';
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
            fireToast('Templates synchronized with Meta', 'success');
          } else {
            setShowTroubleshoot(true);
          }
        } else {
          if (Array.isArray(data)) setTemplates(data);
        }
      } else {
        fireToast(data.error || 'Failed to sync templates', 'error');
      }
    } catch (e: any) {
      console.error(e);
      fireToast('Network error: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleCreateTemplate = async (formData: {
    name: string;
    language: string;
    category: string;
    bodyText: string;
  }) => {
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
      fireToast('Template submitted to Meta successfully! Meta can take up to 24 hours to review and approve your template.', 'success');
      setShowModal(false);
      fetchTemplates(true);
    } else {
      const err = await res.json();
      const msg = err.dbError
        ? `${err.error}. Database Error: ${err.dbError.message || 'Check logs'}`
        : err.error || 'Failed to create template';
      throw new Error(msg);
    }
  };

  const handleResubmitRejected = async (formData: {
    oldTemplateId: string;
    name: string;
    language: string;
    category: string;
    bodyText: string;
  }) => {
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
      fireToast('Updated template submitted to Meta successfully! Meta can take up to 24 hours to review and approve your template.', 'success');
      setEditingRejectedTemplate(null);
      fetchTemplates(true);
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to resubmit template');
    }
  };

  const [deletingTemplateData, setDeletingTemplateData] = useState<{ ids: string[]; label: string } | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeletingTemplateData({
      ids: Array.from(selectedIds),
      label: `${selectedIds.size} template(s)`
    });
  };

  const handleDeleteSingleTemplate = (id: string, name: string) => {
    setDeletingTemplateData({
      ids: [id],
      label: `template "${name}"`
    });
  };

  const confirmDeleteTemplates = async () => {
    if (!deletingTemplateData) return;
    setDeletingTemplate(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (tenant?.id) {
        headers['x-tenant-id'] = tenant.id;
      }

      const res = await fetch('/api/templates', {
        method: 'DELETE',
        credentials: 'include',
        headers,
        body: JSON.stringify({ ids: deletingTemplateData.ids })
      });

      if (res.ok) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          deletingTemplateData.ids.forEach(id => next.delete(id));
          return next;
        });
        fireToast('Template(s) deleted successfully from Meta and catalog', 'success');
        setDeletingTemplateData(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        fireToast('Error deleting template: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      fireToast('Error: ' + err.message, 'error');
    } finally {
      setDeletingTemplate(false);
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
      <SyncPanel
        syncing={syncing}
        selectedCount={selectedIds.size}
        onSync={() => fetchTemplates(true)}
        onDeleteSelected={handleDeleteSelected}
        onCreate={() => setShowModal(true)}
      />

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20 opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-fg mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Loading Catalog...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="relative rounded-[2.5rem] overflow-hidden border border-glass-border shadow-2xl bg-glass-card mt-4 group">
            <img 
              src="/images/template_builder.jpg" 
              alt="WhatsApp Message Template Catalog" 
              loading="lazy"
              decoding="async"
              className="w-full h-[260px] sm:h-[300px] object-cover filter brightness-[0.75] group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 sm:p-10 flex flex-col justify-end items-start text-left">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase rounded-full tracking-widest mb-3">
                Meta Message Templates
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">No Templates Available</h3>
              <p className="text-xs text-slate-300 font-medium max-w-md mt-1 leading-relaxed">
                Pull pre-approved templates directly from your Meta Business Account sync, or build your first template draft here.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => fetchTemplates(true)}
                  disabled={syncing}
                  className="px-5 py-2.5 bg-fg text-bg rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-lg"
                >
                  {syncing ? 'Syncing...' : 'Sync with Meta'}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  + Create Template
                </button>
              </div>
            </div>
          </div>
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onEditRejected={(t) => setEditingRejectedTemplate(t)}
              onDeleteSingle={(id) => handleDeleteSingleTemplate(id, template.name)}
            />
          ))
        )}
      </div>

      {/* Luxury Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTemplateData}
        title="Delete Template"
        description={`Are you sure you want to delete ${deletingTemplateData?.label || 'this template'}? This action will automatically delete the template from Meta Cloud API and purge it from your catalog.`}
        confirmText="Delete Template"
        isDeleting={deletingTemplate}
        onConfirm={confirmDeleteTemplates}
        onClose={() => setDeletingTemplateData(null)}
      />

      {editingRejectedTemplate && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <EditRejectedTemplateModal
            template={editingRejectedTemplate}
            onClose={() => setEditingRejectedTemplate(null)}
            onToast={fireToast}
            onResubmit={handleResubmitRejected}
          />
        </Suspense>
      )}

      {showTroubleshoot && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <TroubleshootModal
            portfolioId={portfolioId || tenant?.whatsapp_account?.portfolio_id || tenant?.whatsapp_account?.business_id}
            wabaId={tenant?.whatsapp_account?.business_id}
            onClose={() => setShowTroubleshoot(false)}
            onCreateLocal={() => {
              setShowTroubleshoot(false);
              setShowModal(true);
            }}
          />
        </Suspense>
      )}

      {showModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <CreateTemplateModal
            tenant={tenant}
            onClose={() => setShowModal(false)}
            onToast={fireToast}
            onSaved={handleCreateTemplate}
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
