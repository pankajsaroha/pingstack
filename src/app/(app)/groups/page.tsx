'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Plus, Folder, Trash2, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import GroupCard from './_components/GroupCard';

const GroupDetailModal = lazy(() => import('./_components/GroupDetailModal'));
const ImportModal = lazy(() => import('./_components/ImportModal'));

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (Array.isArray(data)) setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const handleSavedGroup = async (groupName: string, type: 'GOOGLE' | 'FILE', fileOrToken?: any) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create group');
    }

    const data = await res.json();
    const groupId = data.id;

    if (type === 'GOOGLE') {
      const gRes = await fetch('/api/contacts/import/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: fileOrToken, groupId })
      });
      const gData = await gRes.json();
      if (gData.success) {
        fireToast(`Group created and ${gData.count} contacts imported`, 'success');
      } else {
        fireToast(gData.error || 'Google contact import failed', 'error');
      }
    } else if (type === 'FILE' && fileOrToken) {
      const formData = new FormData();
      formData.append('file', fileOrToken);
      formData.append('groupId', groupId);

      const fRes = await fetch('/api/contacts/upload-csv', {
        method: 'POST',
        body: formData,
      });
      if (fRes.ok) {
        fireToast('Contacts uploaded', 'success');
      } else {
        const fData = await fRes.json();
        fireToast('Error: ' + fData.error, 'error');
      }
    } else {
      fireToast('Empty group created successfully', 'success');
    }

    fetchGroups();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} group(s)?`)) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchGroups();
      } else {
        const data = await res.json();
        fireToast('Error: ' + data.error, 'error');
      }
    } catch (err: any) {
      fireToast('Error: ' + err.message, 'error');
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleManageGroup = (group: any) => {
    setActiveGroup(group);
    setShowDetailModal(true);
  };

  return (
    <div>
      {/* Header Panel */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg text-left">Groups</h1>
          <p className="text-muted text-sm font-semibold mt-1">Organize and segment contacts into distribution lists.</p>
        </div>
        <div className="flex space-x-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center px-5 py-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 cursor-pointer border-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-fg mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-fg/50">Loading groups directory...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full bg-glass-card border border-glass-border p-12 mt-4 rounded-[2.5rem] text-center shadow-xl">
            <Folder className="mx-auto h-12 w-12 text-fg/20 mb-4 animate-pulse-slow" />
            <h3 className="text-base font-black text-fg mb-1">No Active Groups</h3>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">Create a new group to segment your contacts directory lists.</p>
          </div>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onManage={handleManageGroup}
            />
          ))
        )}
      </div>

      {/* Create / Import Modal */}
      {showModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <ImportModal
            onClose={() => setShowModal(false)}
            onToast={fireToast}
            onSaved={handleSavedGroup}
          />
        </Suspense>
      )}

      {/* Group Detail Modal */}
      {showDetailModal && activeGroup && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <GroupDetailModal
            group={activeGroup}
            onClose={() => {
              setShowDetailModal(false);
              setActiveGroup(null);
              fetchGroups();
            }}
            onToast={fireToast}
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
