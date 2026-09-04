'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Trash2, Send, Plus, Loader2, Globe } from 'lucide-react';
import Toast from '@/components/Toast';
import ContactsTable from './ContactsTable';
import ImportContacts from './ImportContacts';

import { Contact, Template } from '@/types';

const AddContactModal = lazy(() => import('./AddContactModal'));
const EditContactModal = lazy(() => import('./EditContactModal'));
const ImportLimitModal = lazy(() => import('./ImportLimitModal'));
const SendTemplateModal = lazy(() => import('./SendTemplateModal'));
import GoogleDuplicateModal from './GoogleDuplicateModal';

interface ContactsClientProps {
  initialContacts: { contacts: Contact[]; totalCount: number };
  initialTemplates: Template[];
}

export default function ContactsClient({
  initialContacts,
  initialTemplates,
}: ContactsClientProps) {
  const [pageSize, setPageSize] = useState<number>(10);
  const [allContactsPool, setAllContactsPool] = useState<Contact[]>(
    Array.isArray(initialContacts) ? initialContacts : (initialContacts.contacts || [])
  );
  const [templates] = useState<Template[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  const [importLimitInfo, setImportLimitInfo] = useState<any | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const fetchAllContactsPool = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.contacts || []);
        setAllContactsPool(list);
      }
    } catch (e) {
      console.error('Failed to load contacts pool', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllContactsPool();
  }, []);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    setPage(1);
  };

  const cleanSearch = searchInput.trim().toLowerCase();
  const digitsSearch = cleanSearch.replace(/\D/g, '');

  // 100% Instant In-Memory Filtered Contacts Pool
  const filteredContactsPool = useMemo(() => {
    if (!cleanSearch) return allContactsPool;
    return allContactsPool.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(cleanSearch);
      const rawPhone = c.phone_number || '';
      const phoneMatch = rawPhone.includes(cleanSearch) || (digitsSearch.length > 0 && rawPhone.includes(digitsSearch));
      return nameMatch || phoneMatch;
    });
  }, [allContactsPool, cleanSearch, digitsSearch]);

  const totalCount = filteredContactsPool.length;

  const displayedContacts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredContactsPool.slice(start, start + pageSize);
  }, [filteredContactsPool, page, pageSize]);

  // Re-fetch helper
  const refetchContacts = async () => {
    await fetchAllContactsPool();
  };

  const [googleDuplicateInfo, setGoogleDuplicateInfo] = useState<any | null>(null);
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);

  const performGoogleImport = async (token: string, confirmLimit = false, duplicateAction?: 'skip_all' | 'overwrite_all') => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/contacts/import/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, confirmLimit, duplicateAction })
      });
      const data = await res.json();
      if (res.ok && !data.limitWarning && !data.duplicateWarning) {
        fireToast(`Imported ${data.count || 0} contacts from Google`, 'success');
        setImportLimitInfo(null);
        setGoogleDuplicateInfo(null);
        setPendingAccessToken(null);
        await refetchContacts();
      } else if (data.duplicateWarning) {
        setPendingAccessToken(token);
        setGoogleDuplicateInfo(data);
      } else if (data.limitWarning) {
        setPendingAccessToken(token);
        setImportLimitInfo(data);
      } else {
        fireToast(data.error || 'Google import failed', 'error');
      }
    } catch (e) {
      fireToast('Google import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleGoogleImport = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      fireToast('Google Client ID not configured', 'error');
      return;
    }

    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/contacts.readonly',
      callback: async (response: any) => {
        if (response.error) {
          console.error(response);
          return;
        }
        await performGoogleImport(response.access_token, false);
      },
    });
    client.requestAccessToken();
  };

  const handleFileUpload = async (e?: React.ChangeEvent<HTMLInputElement>, confirmLimit = false, fileToUpload?: File) => {
    const file = fileToUpload || e?.target?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (confirmLimit) {
      formData.append('confirmLimit', 'true');
    }

    try {
      const res = await fetch('/api/contacts/upload-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && !data.limitWarning) {
        fireToast('Contacts uploaded successfully', 'success');
        setImportLimitInfo(null);
        setPendingFile(null);
        await refetchContacts();
      } else if (data.limitWarning) {
        setPendingFile(file);
        setImportLimitInfo(data);
      } else {
        fireToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      fireToast('Upload failed', 'error');
    } finally {
      setUploading(false);
      if (e?.target) e.target.value = '';
    }
  };

  const handleAddContact = async (name: string, phone: string) => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone_number: phone })
    });
    if (res.ok) {
      await refetchContacts();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add contact');
    }
  };

  const handleUpdateContact = async (id: string, name: string, phone: string) => {
    const res = await fetch('/api/contacts', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, phone_number: phone })
    });
    if (res.ok) {
      fireToast('Contact updated successfully', 'success');
      await refetchContacts();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update contact');
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSingleContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        fireToast('Contact deleted successfully', 'success');
        await refetchContacts();
      } else {
        const errorMsg = data.error || `Unable to delete contact (Status ${res.status})`;
        fireToast(errorMsg, 'error');
      }
    } catch (err: any) {
      fireToast(`Delete Error: ${err.message || 'Network connection failed'}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendTemplate = async (template: any, vars: Record<string, Record<string, string>>) => {
    const contactVars: Record<string, string[]> = {};
    Object.entries(vars).forEach(([cid, v]) => {
      contactVars[cid] = Object.values(v);
    });

    const res = await fetch('/api/messages/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactIds: Array.from(selectedIds),
        template_id: template.id,
        contactVars
      })
    });

    if (res.ok) {
      setSelectedIds(new Set());
      fireToast('Message queued. Go to inbox to see.', 'success');
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to send template messages');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      fireToast('Please select at least one contact to delete.', 'info');
      return;
    }
    const countToDelete = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${countToDelete} selected contact${countToDelete > 1 ? 's' : ''}?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSelectedIds(new Set());
        fireToast(`Successfully deleted ${data.count || countToDelete} contacts`, 'success');
        await refetchContacts();
      } else {
        const errorMsg = data.error || (res.status === 400 ? 'Could not delete selected contacts. Please check if they are currently in use.' : `Server error (${res.status})`);
        fireToast(errorMsg, 'error');
      }
    } catch (err: any) {
      fireToast(`Delete Error: ${err.message || 'Network connection error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContactsPool.map(c => c.id)));
      fireToast(`Selected all ${filteredContactsPool.length} contacts`, 'info');
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Contacts Directory</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Manage, import, and sync your WhatsApp audience directory.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete ({selectedIds.size})</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Template</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Contact</span>
            </button>

            <ImportContacts
              isImporting={isImporting}
              uploading={uploading}
              onGoogleImport={handleGoogleImport}
              onCsvUpload={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* Search and Table Container */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        {/* Filters Header */}
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="relative w-72">
            <input
              type="text"
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Search contacts by name or phone..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-zinc-500 font-mono">Loading contacts directory...</p>
          </div>
        ) : allContactsPool.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Contacts Added Yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed">
              Import customer phone numbers using CSV spreadsheets or sync directly with Google Contacts.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              + Add First Contact
            </button>
          </div>
        ) : (
          <>
            <ContactsTable
              contacts={displayedContacts}
              selectedIds={selectedIds}
              searchQuery={searchInput}
              deletingId={deletingId}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAll}
              onEditContact={(c) => setEditingContact(c)}
              onDeleteSingle={handleDeleteSingleContact}
            />

            {/* Pagination & Rows Per Page Controls */}
            <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-zinc-500 font-mono text-[11px]">
                  Showing {totalCount === 0 ? 0 : Math.min(totalCount, (page - 1) * pageSize + 1)}–{Math.min(totalCount, page * pageSize)} of {totalCount} contacts
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalCount > pageSize && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-900 disabled:opacity-40 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-900 disabled:opacity-40 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <AddContactModal
            onClose={() => setShowAddModal(false)}
            onToast={fireToast}
            onSaved={handleAddContact}
          />
        </Suspense>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <EditContactModal
            contact={editingContact}
            onClose={() => setEditingContact(null)}
            onToast={fireToast}
            onUpdated={handleUpdateContact}
          />
        </Suspense>
      )}

      {/* Import Plan Limit Warning Modal */}
      {importLimitInfo && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <ImportLimitModal
            limitInfo={importLimitInfo}
            onConfirmTruncated={() => {
              if (importLimitInfo.isGoogle && pendingAccessToken) {
                performGoogleImport(pendingAccessToken, true);
              } else if (pendingFile) {
                handleFileUpload(undefined, true, pendingFile);
              }
            }}
            onCancel={() => {
              setImportLimitInfo(null);
              setPendingFile(null);
              setPendingAccessToken(null);
            }}
          />
        </Suspense>
      )}

      {/* Google Duplicate Warning Modal */}
      {googleDuplicateInfo && (
        <GoogleDuplicateModal
          duplicateData={googleDuplicateInfo}
          onSkipAll={() => {
            if (pendingAccessToken) {
              performGoogleImport(pendingAccessToken, false, 'skip_all');
            }
          }}
          onOverwriteAll={() => {
            if (pendingAccessToken) {
              performGoogleImport(pendingAccessToken, false, 'overwrite_all');
            }
          }}
          onCancel={() => {
            setGoogleDuplicateInfo(null);
            setPendingAccessToken(null);
          }}
        />
      )}
      {showSendModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <SendTemplateModal
            selectedIds={selectedIds}
            templates={templates}
            contacts={allContactsPool}
            onClose={() => setShowSendModal(false)}
            onToast={fireToast}
            onSent={handleSendTemplate}
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
