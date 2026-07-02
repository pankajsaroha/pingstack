'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Search, Send, Trash2, Loader2, Globe, ArrowRight, X, ChevronRight, Zap, Check } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';
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
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateStep, setTemplateStep] = useState<'SELECT' | 'VARS'>('SELECT');
  const [bulkVars, setBulkVars] = useState<Record<string, Record<string, string>>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);

  const filteredContacts = contacts.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      (c.name?.toLowerCase() || '').includes(query) ||
      c.phone_number.includes(query)
    );
  });

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
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
      const res = await fetch('/api/templates', { credentials: 'include' });
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
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: response.access_token })
          });
          const data = await res.json();
          if (data.success) {
            setToast({ message: `Imported ${data.count} contacts`, type: 'success' });
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
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        setToast({ message: 'Contacts uploaded', type: 'success' });
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
        credentials: 'include',
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
      const contactVars: Record<string, string[]> = {};
      Object.entries(bulkVars).forEach(([cid, vars]) => {
        contactVars[cid] = Object.values(vars);
      });

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          template_id: selectedTemplate.id,
          contactVars
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setShowSendModal(false);
        setSelectedTemplate(null);
        setTemplateStep('SELECT');
        setBulkVars({});
        setSelectedIds(new Set());
        setToast({ message: 'Messages queued', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + (data.error || 'Failed to send'), type: 'error' });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setToast({ message: 'Request timed out. Please retry.', type: 'error' });
      } else {
        setToast({ message: 'Network error occurred.', type: 'error' });
      }
      console.error('Send error:', err);
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
        credentials: 'include',
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg">Contacts</h1>
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
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg"
              >
                <Send className="mr-2 h-4 w-4" />
                <span>Send template</span>
              </button>
            </div>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center px-5 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </button>
            
            <button 
              onClick={handleGoogleImport}
              disabled={isImporting}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-glass-input border border-glass-border rounded-2xl font-black text-xs text-fg hover:bg-white/10 transition-all cursor-pointer uppercase tracking-wider"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Globe className="w-4 h-4 mr-2 text-indigo-400" />}
              Google Contacts
            </button>

            <button 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-glass-input border border-glass-border rounded-2xl font-black text-xs text-fg hover:bg-white/10 transition-all cursor-pointer uppercase tracking-wider"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Upload className="w-4 h-4 mr-2 text-emerald-400" />}
              Upload CSV
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

      {/* Search and Table Grid */}
      <div className="bg-glass-card border border-glass-border shadow-2xl rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-glass-border flex justify-between items-center">
          <div className="relative rounded-2xl w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-fg/20 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              className="focus:border-indigo-500 focus:outline-none block w-full pl-11 pr-4 py-3 text-sm font-semibold border border-glass-border rounded-2xl bg-glass-input text-fg placeholder:text-fg/20 transition-all"
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
             <Globe className="w-12 h-12 text-fg mb-4" />
             <p className="text-sm font-black uppercase tracking-widest text-fg/60">No Contacts Found</p>
             <p className="text-xs text-muted mt-2 max-w-xs mx-auto leading-relaxed">Import contacts using Excel, CSV templates or sync your Google Contacts.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-glass-card/85 border-b border-glass-border">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        className="h-5 w-5 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-[9px] font-black text-muted uppercase tracking-widest">Name</th>
                    <th scope="col" className="px-6 py-4 text-left text-[9px] font-black text-muted uppercase tracking-widest">Phone Number</th>
                    <th scope="col" className="px-6 py-4 text-left text-[9px] font-black text-muted uppercase tracking-widest">Added On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-glass-card transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap w-12 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelection(contact.id)}
                          className="h-5 w-5 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-fg">{contact.name || 'Anonymous'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-fg/50 font-mono tracking-tight">{contact.phone_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[10px] font-black text-fg/30 uppercase tracking-tight">{new Date(contact.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-white/5">
              {filteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  onClick={() => toggleSelection(contact.id)}
                  className={`p-5 flex items-center justify-between active:bg-glass-card transition-colors ${selectedIds.has(contact.id) ? 'bg-indigo-500/5' : ''}`}
                >
                  <div className="flex items-center">
                     <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-4 transition-colors ${
                       selectedIds.has(contact.id) ? 'bg-white border-white' : 'border-glass-border bg-glass-input'
                     }`}>
                        {selectedIds.has(contact.id) && <Check className="w-3.5 h-3.5 text-black" />}
                     </div>
                     <div>
                        <p className="font-bold text-fg text-sm">{contact.name || 'Anonymous'}</p>
                        <p className="text-[10px] text-muted font-semibold tracking-wide mt-1 font-mono">{contact.phone_number}</p>
                     </div>
                  </div>
                  <span className="text-[9px] text-fg/30 font-black uppercase tracking-tight">
                     {new Date(contact.created_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-fg mb-6 tracking-tight">Add Contact</h3>
            <form onSubmit={handleAddContact}>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Phone Number (with Country Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +919876543210"
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20 font-mono"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message Wizard Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 overflow-hidden">
            
            <div className="p-6 sm:p-8 border-b border-glass-border flex justify-between items-center bg-glass-card/10">
               <div>
                  <h3 className="text-xl font-black text-fg tracking-tight">
                    {templateStep === 'SELECT' ? 'Choose Template' : 'Personalize variables'}
                  </h3>
                  <p className="text-[9px] font-black text-indigo-400 mt-1.5 uppercase tracking-widest flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2 animate-pulse" />
                     Dispatching to {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''}
                  </p>
               </div>
               <button 
                onClick={() => {
                   setShowSendModal(false);
                   setSelectedTemplate(null);
                   setTemplateStep('SELECT');
                   setBulkVars({});
                }} 
                className="p-2 hover:bg-glass-input rounded-xl transition-colors cursor-pointer text-muted hover:text-fg"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
               {templateStep === 'SELECT' ? (
                  <div className="grid grid-cols-1 gap-4">
                     {templates.filter(t => t.status === 'APPROVED').map(tpl => {
                        const hasVars = tpl.content?.includes('{{1}}');
                        return (
                          <div 
                            key={tpl.id} 
                            onClick={() => {
                               setSelectedTemplate(tpl);
                               if (hasVars) {
                                 setTemplateStep('VARS');
                                 const initial: any = {};
                                 Array.from(selectedIds).forEach(cid => {
                                   initial[cid] = {};
                                 });
                                 setBulkVars(initial);
                               } else {
                                 setTemplateStep('VARS');
                               }
                            }}
                            className="p-5 bg-glass-input border border-glass-border rounded-2xl hover:border-glass-border hover:bg-glass-card cursor-pointer group transition-all relative active:scale-[0.98] flex items-center shadow-md"
                          >
                             <div className="flex-1 min-w-0 pr-4">
                                <div className="flex justify-between items-start mb-2">
                                   <div className="flex items-center">
                                      <h4 className="text-xs font-black text-fg group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{tpl.name}</h4>
                                      {hasVars && (
                                         <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[7px] font-black uppercase tracking-widest">Personalization required</span>
                                      )}
                                   </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{tpl.language}</span>
                                </div>
                                <p className="text-xs text-muted leading-snug italic font-semibold line-clamp-2">"{tpl.content}"</p>
                             </div>
                              <div className="w-8 h-8 bg-fg text-bg rounded-full flex items-center justify-center shrink-0">
                                 <ArrowRight className="w-4 h-4" />
                              </div>
                          </div>
                        )
                     })}
                  </div>
               ) : (
                  <div className="space-y-6">
                    <div className="bg-glass-card/20 p-5 rounded-2xl border border-glass-border">
                       <h4 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center">
                          <Zap className="w-3 h-3 mr-1.5" /> Template Layout Preview
                       </h4>
                       <p className="text-xs leading-relaxed italic text-fg/70">"{selectedTemplate?.content}"</p>
                    </div>

                    {(selectedTemplate?.content?.match(/\{\{\d+\}\}/g) || []).length > 0 ? (
                       <div className="space-y-4">
                          <div className="flex justify-between items-center mb-2">
                             <h5 className="text-[9px] font-black text-fg/30 uppercase tracking-widest ml-1">Dynamic values</h5>
                             {selectedIds.size > 1 && (
                               <button 
                                 type="button"
                                 onClick={() => {
                                    const firstId = Array.from(selectedIds)[0];
                                    const baseVars = bulkVars[firstId] || {};
                                    const updated = { ...bulkVars };
                                    Array.from(selectedIds).forEach(cid => {
                                      updated[cid] = { ...baseVars };
                                    });
                                    setBulkVars(updated);
                                 }}
                                 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-fg transition-colors cursor-pointer"
                               >
                                  Copy Variable 1 to all rows
                               </button>
                             )}
                          </div>
                          
                          <div className="bg-glass-input border border-glass-border rounded-3xl overflow-hidden shadow-sm">
                             <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-glass-card/85">
                                   <tr>
                                      <th className="px-4 py-3 text-left text-[9px] font-black text-muted uppercase tracking-widest">Contact</th>
                                      {(selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).map((_: any, i: number) => (
                                         <th key={i} className="px-4 py-3 text-left text-[9px] font-black text-muted uppercase tracking-widest">Var {i + 1}</th>
                                      ))}
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-transparent">
                                   {Array.from(selectedIds).map(cid => {
                                      const contact = contacts.find(c => c.id === cid);
                                      return (
                                        <tr key={cid} className="hover:bg-glass-card">
                                           <td className="px-4 py-3 whitespace-nowrap">
                                              <p className="text-xs font-bold text-fg truncate max-w-[120px]">{contact?.name || contact?.phone_number}</p>
                                           </td>
                                           {(selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).map((_: any, i: number) => (
                                              <td key={i} className="px-2 py-2">
                                                 <input 
                                                   type="text"
                                                   placeholder={`value...`}
                                                   value={bulkVars[cid]?.[i+1] || ''}
                                                   onChange={(e) => setBulkVars({
                                                      ...bulkVars,
                                                      [cid]: { ...(bulkVars[cid] || {}), [i+1]: e.target.value }
                                                   })}
                                                   className="w-full bg-glass-input border border-glass-border focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-fg placeholder:text-fg/10"
                                                 />
                                              </td>
                                           ))}
                                        </tr>
                                      )
                                   })}
                                </tbody>
                             </table>
                          </div>
                          
                          {selectedIds.size > 10 && (
                             <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start">
                                <p className="text-[10px] text-muted font-semibold leading-relaxed">
                                   <span className="font-black uppercase tracking-tight text-indigo-400 mr-1.5">Note:</span> 
                                   For bulk dispatches over 10 contacts, we recommend using <Link href="/campaigns" className="underline text-fg font-bold hover:text-indigo-400">Campaigns Excel Drops</Link> for unified file parsing.
                                </p>
                             </div>
                          )}
                       </div>
                    ) : (
                       <div className="py-12 text-center">
                          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                             <Check className="w-6 h-6 text-emerald-400" />
                          </div>
                          <h5 className="font-black text-fg uppercase tracking-widest text-xs">Awaiting dispatch</h5>
                          <p className="text-xs text-muted mt-1.5">This template layout is static and does not contain variable hooks.</p>
                       </div>
                    )}
                  </div>
               )}
            </div>

            <div className="p-6 border-t border-glass-border bg-glass-card/10 flex justify-between items-center sm:flex-row flex-col gap-4">
               {templateStep === 'VARS' ? (
                  <>
                    <button 
                      onClick={() => setTemplateStep('SELECT')}
                      className="w-full sm:w-auto px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-fg cursor-pointer transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      disabled={sending}
                      className="w-full sm:w-auto px-8 py-3.5 bg-fg text-bg hover:opacity-90 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center cursor-pointer"
                    >
                      {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      {sending ? 'Sending...' : `Send to ${selectedIds.size} Contacts`}
                    </button>
                  </>
               ) : (
                  <p className="text-[9px] font-black text-fg/30 uppercase tracking-widest mx-auto sm:mx-0">Select a template to proceed</p>
               )}
            </div>

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
