'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Search, Send, Trash2, Loader2, Globe } from 'lucide-react';
import Script from 'next/script';
import Toast from '@/components/Toast';

export default function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleImport = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setToast({ message: 'Google Client ID not configured', type: 'error' });
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: response.access_token })
          });
          const data = await res.json();
          if (data.success) {
            setToast({ message: `Successfully imported ${data.count} contacts!`, type: 'success' });
            fetchContacts();
          } else {
            setToast({ message: data.error || 'Import failed', type: 'error' });
          }
        } catch (e) {
          setToast({ message: 'Google import failed', type: 'error' });
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
        body: formData,
      });
      if (res.ok) {
        setToast({ message: 'Contacts uploaded successfully!', type: 'success' });
        fetchContacts();
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + data.error, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone_number: newPhone })
      });
      if (res.ok) {
        setNewName('');
        setNewPhone('');
        setShowAddModal(false);
        fetchContacts();
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + data.error, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error: ' + err.message, type: 'error' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || selectedIds.size === 0) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          template_id: selectedTemplate
        })
      });

      if (res.ok) {
        setShowSendModal(false);
        setSelectedTemplate('');
        setSelectedIds(new Set());
        setToast({ message: 'Messages queued successfully!', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + data.error, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error: ' + err.message, type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} contacts?`)) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchContacts();
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + data.error, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Error: ' + err.message, type: 'error' });
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === contacts.length && contacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const isAllSelected = contacts.length > 0 && selectedIds.size === contacts.length;

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 ring-offset-4">Contacts</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleDeleteSelected}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 border border-red-200 rounded-2xl shadow-sm text-xs font-black text-red-700 bg-red-50 hover:bg-red-100 transition-all active:scale-95"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Delete</span>
                <span className="hidden sm:inline">Delete Selected</span>
              </button>
              <button 
                onClick={() => setShowSendModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 border border-transparent rounded-2xl shadow-sm text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Send className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Send ({selectedIds.size})</span>
                <span className="hidden sm:inline">Send Message ({selectedIds.size})</span>
              </button>
            </div>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 border border-transparent rounded-2xl shadow-lg text-xs font-black text-white bg-gray-900 hover:bg-black transition-all active:scale-95"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </button>
            
            <button 
              onClick={handleGoogleImport}
              disabled={isImporting}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-white border border-gray-100 rounded-2xl font-black text-[10px] sm:text-xs text-gray-700 hover:bg-gray-50 transition-all shadow-md active:scale-95 uppercase tracking-wider"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Globe className="w-4 h-4 mr-2 text-blue-500" />}
              Google
            </button>

            <button 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-white border border-gray-100 rounded-2xl font-black text-[10px] sm:text-xs text-gray-700 hover:bg-gray-50 transition-all shadow-md active:scale-95 uppercase tracking-wider"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-green-500" /> : <Upload className="w-4 h-4 mr-2 text-green-500" />}
              File
            </button>
          </div>

          <input 
            id="file-upload"
            type="file" 
            accept=".csv,.xlsx" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/60 overflow-hidden">
        <div className="p-4 border-b border-gray-200/60 bg-gray-50/50 flex justify-between items-center">
          <div className="relative rounded-md shadow-sm w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-black focus:border-black block w-full pl-10 sm:text-sm border-gray-300 rounded-md bg-white/50"
              placeholder="Search contacts..."
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center grayscale opacity-50">
             <Loader2 className="w-8 h-8 animate-spin mb-4" />
             <p className="text-xs font-black uppercase tracking-widest text-gray-500">Syncing your contacts library...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center opacity-50">
             <Globe className="w-12 h-12 text-gray-200 mb-4" />
             <p className="text-sm font-bold text-gray-500">No contacts found</p>
             <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Import an Excel/CSV file or connect Google Contacts to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/60">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Added On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100/60">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap w-12 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelection(contact.id)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer transition-transform active:scale-90"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-900">{contact.name || 'Anonymous'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400 font-mono tracking-tight">{contact.phone_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-gray-300 uppercase tracking-tight">{new Date(contact.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden divide-y divide-gray-100">
              {contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  onClick={() => toggleSelection(contact.id)}
                  className={`p-4 flex items-center justify-between active:bg-gray-50 transition-colors ${selectedIds.has(contact.id) ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-center">
                     <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-4 transition-colors ${
                       selectedIds.has(contact.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                     }`}>
                        {selectedIds.has(contact.id) && <Plus className="w-3 h-3 text-white" />}
                     </div>
                     <div>
                        <p className="font-bold text-gray-900 text-sm">{contact.name || 'No Name'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{contact.phone_number}</p>
                     </div>
                  </div>
                  <span className="text-[9px] text-gray-300 font-black uppercase tracking-tight">
                     {new Date(contact.created_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals omitted for brevity - wait, write_to_file needs everything so I include them */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Add Contact</h3>
            <form onSubmit={handleAddContact}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+1234567890"
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Send to {selectedIds.size} Contact{selectedIds.size > 1 ? 's' : ''}</h3>
            <form onSubmit={handleSendMessage}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Template</label>
                <select
                  required
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Choose a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {sending ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      
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
