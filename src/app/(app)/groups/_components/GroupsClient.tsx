'use client';

import { useState, lazy, Suspense } from 'react';
import { Plus, Folder, Trash2, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';
import GroupCard from './GroupCard';

import * as XLSX from 'xlsx';

const GroupDetailModal = lazy(() => import('./GroupDetailModal'));
const ImportModal = lazy(() => import('./ImportModal'));
const ExportFormatModal = lazy(() => import('./ExportFormatModal'));

interface GroupsClientProps {
  initialGroups: any[];
}

export default function GroupsClient({ initialGroups }: GroupsClientProps) {
  const [groups, setGroups] = useState<any[]>(initialGroups);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [exportingGroup, setExportingGroup] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const fetchGroups = async () => {
    setLoading(true);
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

  const handleSavedGroup = async (groupName: string, type: 'GOOGLE' | 'FILE' | 'EXISTING', fileOrToken?: any) => {
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
    } else if (type === 'EXISTING' && Array.isArray(fileOrToken) && fileOrToken.length > 0) {
      const addRes = await fetch('/api/groups/add-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, contactIds: fileOrToken })
      });
      if (addRes.ok) {
        fireToast(`Group created with ${fileOrToken.length} contact(s)`, 'success');
      } else {
        fireToast('Group created, but failed to attach contacts', 'error');
      }
    } else {
      fireToast('Empty group created successfully', 'success');
    }

    await fetchGroups();
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
        fireToast('Groups deleted', 'success');
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

  const handleExportGroup = async (group: any, format: 'xlsx' | 'csv') => {
    try {
      fireToast(`Preparing download for group "${group.name}"...`, 'info');
      const res = await fetch(`/api/groups/${group.id}/contacts`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch group contacts');
      const contacts = await res.json();

      if (!Array.isArray(contacts) || contacts.length === 0) {
        fireToast(`Group "${group.name}" has no contacts to export.`, 'info');
        return;
      }

      const safeName = (group.name || 'group').toLowerCase().replace(/[^a-z0-9]/g, '_');

      if (format === 'xlsx') {
        const exportData = contacts.map((c: any) => ({
          "Name": c.name || 'Anonymous',
          "Phone Number": c.phone_number || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Group Contacts");
        worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${safeName}_contacts.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        fireToast(`Downloaded ${contacts.length} contacts as .xlsx!`, 'success');
      } else {
        let csvContent = "Name,Phone Number\n";
        contacts.forEach((c: any) => {
          const name = (c.name || 'Anonymous').replace(/"/g, '""');
          const phone = (c.phone_number || '').replace(/"/g, '""');
          csvContent += `"${name}","${phone}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${safeName}_contacts.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        fireToast(`Downloaded ${contacts.length} contacts as .csv!`, 'success');
      }
    } catch (err: any) {
      fireToast('Export Error: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Audience Groups</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Organize and segment contacts into targeted distribution lists.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          <div className="col-span-full p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-zinc-500 font-mono">Loading groups directory...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Folder className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Audience Groups Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed">
              Create contact distribution groups to segment outreach campaigns by customer tier or tags.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              + Create First Group
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onManage={handleManageGroup}
              onDownloadExcel={(g) => setExportingGroup(g)}
              onLaunchCampaign={(g) => {
                window.location.href = `/campaigns?groupId=${g.id}`;
              }}
            />
          ))
        )}
      </div>

      {exportingGroup && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        }>
          <ExportFormatModal
            group={exportingGroup}
            onClose={() => setExportingGroup(null)}
            onExport={(fmt) => handleExportGroup(exportingGroup, fmt)}
          />
        </Suspense>
      )}

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
            onClose={async () => {
              setShowDetailModal(false);
              setActiveGroup(null);
              await fetchGroups();
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
