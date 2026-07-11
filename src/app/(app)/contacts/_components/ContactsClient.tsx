'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Trash2, Send, Plus, Loader2, Globe } from 'lucide-react';
import Toast from '@/components/Toast';
import ContactsTable from './ContactsTable';
import ImportContacts from './ImportContacts';

const AddContactModal = lazy(() => import('./AddContactModal'));
const SendTemplateModal = lazy(() => import('./SendTemplateModal'));

interface ContactsClientProps {
  initialContacts: any[];
  initialTemplates: any[];
}

export default function ContactsClient({
  initialContacts,
  initialTemplates,
}: ContactsClientProps) {
  const [pageSize] = useState(10);
  const [contacts, setContacts] = useState<any[]>(initialContacts.slice(0, 10));
  const [templates] = useState<any[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialContacts.length);
  const [isFirstMount, setIsFirstMount] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const fetchContacts = async (pageNumber: number, query: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/contacts?page=${pageNumber}&pageSize=${pageSize}&search=${encodeURIComponent(query)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data && Array.isArray(data.contacts)) {
        setContacts(data.contacts);
        setTotalCount(data.totalCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search triggers
  useEffect(() => {
    if (isFirstMount) {
      setIsFirstMount(false);
      return;
    }
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchContacts(1, searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Page triggers
  useEffect(() => {
    if (isFirstMount) return;
    fetchContacts(page, searchQuery);
  }, [page]);

  // Re-fetch helper helper
  const refetchContacts = async () => {
    await fetchContacts(page, searchQuery);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/contacts/upload-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        fireToast('Contacts uploaded', 'success');
        await refetchContacts();
      } else {
        const data = await res.json();
        fireToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      fireToast('Upload failed', 'error');
    } finally {
      setUploading(false);
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
    const filtered = contacts.filter(c => {
      const query = searchQuery.toLowerCase();
      return (
        (c.name?.toLowerCase() || '').includes(query) ||
        c.phone_number.includes(query)
      );
    });

    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center opacity-40">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-fg" />
            <p className="text-xs font-black uppercase tracking-widest text-fg/50">Loading contacts directory...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center opacity-30">
            <Globe className="w-12 h-12 text-fg mb-4 animate-pulse-slow" />
            <p className="text-sm font-black uppercase tracking-widest text-fg/60">No Contacts Found</p>
            <p className="text-xs text-muted mt-2 max-w-xs mx-auto leading-relaxed">Import contacts using Excel, CSV templates or sync your Google Contacts.</p>
          </div>
        ) : (
          <>
            <ContactsTable
              contacts={contacts}
              selectedIds={selectedIds}
              searchQuery={searchQuery}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAll}
            />

            {/* Pagination Controls */}
            {totalCount > pageSize && (
              <div className="p-6 border-t border-glass-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-glass-card/10">
                <p className="text-xs font-bold text-muted">
                  Showing {Math.min(totalCount, (page - 1) * pageSize + 1)}–{Math.min(totalCount, page * pageSize)} of {totalCount} contacts
                </p>
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
              </div>
            )}
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
            contacts={contacts}
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
