'use client';

import { useState, lazy, Suspense } from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import SyncPanel from './SyncPanel';
import TemplateCard from './TemplateCard';

const CreateTemplateModal = lazy(() => import('./CreateTemplateModal'));
const TroubleshootModal = lazy(() => import('./TroubleshootModal'));

interface TemplatesClientProps {
  tenant: any;
  initialTemplates: any[];
}

export default function TemplatesClient({ tenant, initialTemplates }: TemplatesClientProps) {
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
      fireToast('Template submitted to Meta', 'success');
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

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} template(s)?`)) return;

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (tenant?.id) {
        headers['x-tenant-id'] = tenant.id;
      }

      const res = await fetch('/api/templates', {
        method: 'DELETE',
        credentials: 'include',
        headers,
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fireToast('Templates deleted', 'success');
        fetchTemplates();
      } else {
        const data = await res.json();
        fireToast('Error: ' + data.error, 'error');
      }
    } catch (err: any) {
      fireToast('Error: ' + err.message, 'error');
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
          <div className="bg-glass-card border border-glass-border p-12 mt-4 rounded-[2.5rem] text-center shadow-xl">
            <LayoutTemplate className="mx-auto h-12 w-12 text-fg/20 mb-4 animate-pulse-slow" />
            <h3 className="text-base font-black text-fg mb-1">No Active Templates</h3>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">Pull templates from Meta cloud sync, or build your first template draft here.</p>
          </div>
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />
          ))
        )}
      </div>

      {showTroubleshoot && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <TroubleshootModal
            portfolioId={portfolioId}
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
