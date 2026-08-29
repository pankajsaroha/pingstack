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

        setIsImporting(true);
        try {
          const res = await fetch('/api/contacts/import/google', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: response.access_token })
          });
          const data = await res.json();
          if (data.success) {
            fireToast(`Imported ${data.count} contacts`, 'success');
            await refetchContacts();
          } else {
            fireToast(data.error || 'Import failed', 'error');
          }
        } catch (e) {
          fireToast('Google import failed', 'error');
        } finally {
          setIsImporting(false);
        }
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

  const handleDeleteSingleContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });
      if (res.ok) {
        fireToast('Contact deleted', 'success');
        await refetchContacts();
      } else {
        const data = await res.json();
        fireToast('Error: ' + data.error, 'error');
      }
    } catch (err: any) {
      fireToast('Error: ' + err.message, 'error');
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
      fireToast('Messages queued', 'success');
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to send template messages');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} contacts?`)) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await refetchContacts();
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

  const toggleAll = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContactsPool.map(c => c.id)));
      fireToast(`Selected all ${filteredContactsPool.length} contacts`, 'info');
    }
  };

  return (
    <div className="pb-10 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg text-left">Contacts</h1>
          <p className="text-muted text-sm font-semibold mt-1">Manage, import, and sync your outreach contacts directories.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleDeleteSelected}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete ({selectedIds.size})</span>
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg border-0"
              >
                <Send className="mr-2 h-4 w-4" />
                <span>Send template</span>
              </button>
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center px-5 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg border-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
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

      {/* Search and Table Grid */}
      <div className="bg-glass-card border border-glass-border shadow-2xl rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-glass-border flex justify-between items-center">
          <div className="relative rounded-2xl w-64 group">
            <input
              type="text"
              className="focus:border-indigo-500 focus:outline-none block w-full pl-4 pr-4 py-3 text-sm font-semibold border border-glass-border rounded-2xl bg-glass-input text-fg placeholder:text-fg/20 transition-all font-sans"
              placeholder="Search contacts..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-fg" />
            <p className="text-xs font-black uppercase tracking-widest text-fg/50">Loading contacts directory...</p>
          </div>
        ) : allContactsPool.length === 0 ? (
          <div className="relative rounded-b-[2.5rem] overflow-hidden border-t border-glass-border shadow-2xl bg-glass-card group">
            <img 
              src="/images/contacts_groups.jpg" 
              alt="Contacts Directory Management" 
              loading="lazy"
              decoding="async"
              className="w-full h-[260px] sm:h-[300px] object-cover filter brightness-[0.75] group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 sm:p-10 flex flex-col justify-end items-start text-left">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase rounded-full tracking-widest mb-3">
                Audience Directory
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">No Contacts Found</h3>
              <p className="text-xs text-slate-300 font-medium max-w-md mt-1 leading-relaxed">
                Import customer phone numbers using CSV spreadsheets or sync your Google Contacts directory.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-2.5 bg-fg text-bg rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-lg"
                >
                  + Add Contact
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ContactsTable
              contacts={displayedContacts}
              selectedIds={selectedIds}
              searchQuery={searchInput}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAll}
              onEditContact={(c) => setEditingContact(c)}
              onDeleteSingle={handleDeleteSingleContact}
            />

            {/* Pagination & Rows Per Page Controls */}
            <div className="p-6 border-t border-glass-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-glass-card/10">
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-xs font-bold text-muted">
                  Showing {totalCount === 0 ? 0 : Math.min(totalCount, (page - 1) * pageSize + 1)}–{Math.min(totalCount, page * pageSize)} of {totalCount} contacts
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-muted tracking-widest">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="bg-glass-input border border-glass-border rounded-xl px-3 py-1.5 text-xs font-bold text-fg focus:outline-none cursor-pointer"
                  >
                    <option value={10} className="bg-bg text-fg">10</option>
                    <option value={25} className="bg-bg text-fg">25</option>
                    <option value={50} className="bg-bg text-fg">50</option>
                    <option value={100} className="bg-bg text-fg">100</option>
                  </select>
                </div>
              </div>

              {totalCount > pageSize && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-glass-input hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none border border-glass-border text-fg rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    className="px-4 py-2 bg-glass-input hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none border border-glass-border text-fg rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
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
              if (pendingFile) {
                handleFileUpload(undefined, true, pendingFile);
              }
            }}
            onCancel={() => {
              setImportLimitInfo(null);
              setPendingFile(null);
            }}
          />
        </Suspense>
      )}

      {/* Send Message Wizard Modal */}
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
