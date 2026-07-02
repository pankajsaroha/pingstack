'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Folder, Trash2, Upload, Globe, Loader2, X, ChevronLeft, Check } from 'lucide-react';
import Script from 'next/script';
import Toast from '@/components/Toast';

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [selectorIds, setSelectorIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGroups();
  }, []);

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

  const fetchGroupContacts = async (groupId: string) => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/contacts`);
      if (res.ok) {
        const data = await res.json();
        setGroupContacts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchAvailableContacts = async () => {
    setLoadingAvailable(true);
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        const groupContactIds = new Set(groupContacts.map(c => c.id));
        const filtered = data.filter((c: any) => !groupContactIds.has(c.id));
        setAvailableContacts(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleAddSelectedToGroup = async () => {
    if (!activeGroupId || selectorIds.size === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/groups/add-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroupId,
          contactIds: Array.from(selectorIds)
        })
      });
      if (res.ok) {
        setSelectorIds(new Set());
        setShowSelector(false);
        fetchGroupContacts(activeGroupId);
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to add contacts', type: 'error' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveContact = async (idOrIds: string | string[]) => {
    if (!activeGroupId) return;
    const isBulk = Array.isArray(idOrIds);
    const idsToRemove = isBulk ? idOrIds : [idOrIds];
    
    if (!confirm(`Are you sure you want to remove ${idsToRemove.length} contact(s) from this group?`)) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: idsToRemove })
      });
      if (res.ok) {
        setGroupContacts(prev => prev.filter(c => !idsToRemove.includes(c.id)));
        if (isBulk) setSelectedMemberIds(new Set());
        setToast({ message: `${idsToRemove.length} contact(s) removed`, type: 'success' });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to remove contacts', type: 'error' });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent, callback?: (groupId: string) => Promise<void>) => {
    e?.preventDefault();
    if (!newGroupName.trim()) return;

    setIsImporting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName })
      });
      if (res.ok) {
        const data = await res.json();
        const groupId = data.id;
        
        if (callback) {
          await callback(groupId);
        } else {
          setNewGroupName('');
          setShowModal(false);
          fetchGroups();
        }
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to create group', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error creating group', type: 'error' });
    } finally {
      if (!callback) setIsImporting(false);
    }
  };

  const handleGoogleImport = (groupId?: string) => {
    const targetGroupId = groupId || activeGroupId;
    if (!targetGroupId && !newGroupName.trim()) {
      setToast({ message: 'Please enter a group name first', type: 'info' });
      return;
    }
    
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

        await handleCreateGroup(null as any, async (groupId) => {
          try {
            const res = await fetch('/api/contacts/import/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: response.access_token, groupId })
            });
            const data = await res.json();
            if (data.success) {
              setToast({ message: `Group created and ${data.count} contacts imported`, type: 'success' });
              setNewGroupName('');
              setShowModal(false);
              setShowImportModal(false);
              setShowSelector(false);
              fetchGroups();
              if (activeGroupId) fetchGroupContacts(activeGroupId);
            } else {
              setToast({ message: data.error || 'Import failed', type: 'error' });
            }
          } catch (e) {
            setToast({ message: 'Google import failed', type: 'error' });
          } finally {
            setIsImporting(false);
          }
        });
      },
    });
    client.requestAccessToken();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>, groupId?: string) => {
    const file = e.target.files?.[0];
    const targetGroupId = groupId || activeGroupId;
    if (!file) return;

    if (!targetGroupId) {
       await handleCreateGroup(null as any, async (newId) => {
         await uploadProcessedFile(file, newId);
       });
    } else {
       await uploadProcessedFile(file, targetGroupId);
    }
  };

  const uploadProcessedFile = async (file: File, groupId: string) => {
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId);

    try {
      const res = await fetch('/api/contacts/upload-csv', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setToast({ message: 'Contacts uploaded', type: 'success' });
        setNewGroupName('');
        setShowModal(false);
        setShowImportModal(false);
        setShowSelector(false);
        if (activeGroupId) fetchGroupContacts(activeGroupId);
        fetchGroups();
      } else {
        const data = await res.json();
        setToast({ message: 'Error: ' + data.error, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Upload failed', type: 'error' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  return (
    <div>
      {/* Header Panel */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg">Groups</h1>
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
            className="flex items-center px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 cursor-pointer"
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
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">Spawn a new group to segment your contacts directory lists.</p>
          </div>
        ) : (
          groups.map(group => (
            <div 
              key={group.id} 
              className={`bg-glass-card border p-6 rounded-[2.5rem] relative shadow-2xl hover:border-glass-border hover:bg-glass-card transition-all duration-300 ${
                selectedIds.has(group.id) ? 'border-white ring-1 ring-white/10 bg-glass-card' : 'border-glass-border'
              }`}
            >
              <div className="absolute top-5 right-5 z-30">
                <input
                  type="checkbox"

                  checked={selectedIds.has(group.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelection(group.id)}
                  className="h-5 w-5 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center mb-6 pr-8">
                <div className="w-12 h-12 bg-glass-input border border-glass-border text-fg rounded-2xl flex items-center justify-center mr-4">
                  <Folder className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-fg tracking-tight truncate">{group.name}</h3>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-glass-border">
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-glass-input text-fg/50 border border-glass-border">
                   {group.public_id}
                </span>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveGroupId(group.id);
                    setActiveGroup(group);
                    setShowDetailModal(true);
                    fetchGroupContacts(group.id);
                  }}
                  className="text-xs font-black text-indigo-400 hover:text-fg transition-colors cursor-pointer flex items-center py-2 px-3 rounded-xl hover:bg-glass-input"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Manage List
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-black text-fg mb-6 tracking-tight">Spawn Segment Group</h3>
            
            <form onSubmit={handleCreateGroup}>
              <div className="mb-6">
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Group Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Customers"
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl cursor-pointer transition-all flex items-center justify-center"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Empty Group'}
                </button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
                  <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest"><span className="bg-[#0a0a0a] text-white/50 dark:bg-white dark:text-black/50 px-3">Or Populate Asset Import</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-3 bg-glass-input hover:bg-white/10 border border-glass-border rounded-2xl font-black text-[10px] uppercase tracking-widest text-fg cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4 mr-2 text-emerald-400" />
                    Upload File
                  </button>
                  
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => handleGoogleImport()}
                    className="flex items-center justify-center px-4 py-3 bg-glass-input hover:bg-white/10 border border-glass-border rounded-2xl font-black text-[10px] uppercase tracking-widest text-fg cursor-pointer transition-all"
                  >
                    <Globe className="w-4 h-4 mr-2 text-indigo-400" />
                    Google Contacts
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".csv,.xlsx"
        onChange={handleFileImport} 
      />
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

      {/* Group Detail Modal */}
      {showDetailModal && activeGroup && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-t-3xl sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col h-full sm:h-auto sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="p-6 sm:p-8 border-b border-glass-border flex items-center justify-between bg-glass-card/10">
                  <div>
                    <h2 className="text-2xl font-black text-fg tracking-tight">{activeGroup.name}</h2>
                    <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Group Directory Management</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      setActiveGroup(null);
                      setActiveGroupId(null);
                      setSelectedMemberIds(new Set());
                    }}
                    className="p-2 hover:bg-glass-input rounded-xl transition-colors cursor-pointer text-muted hover:text-fg"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-black/10">
                  <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                     <h3 className="text-sm font-black text-fg/30 uppercase tracking-widest">Active Members ({groupContacts.length})</h3>
                     <div className="flex space-x-2">
                        {selectedMemberIds.size > 0 && (
                          <button 
                            onClick={() => handleRemoveContact(Array.from(selectedMemberIds))}
                            className="flex items-center px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Remove selected
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setShowSelector(true);
                            fetchAvailableContacts();
                          }}
                          className="flex items-center px-5 py-2.5 bg-fg text-bg hover:opacity-90 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Contacts
                        </button>
                     </div>
                  </div>

                  {loadingContacts ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                       <Loader2 className="w-8 h-8 animate-spin mb-4 text-fg" />
                       <p className="text-xs font-black uppercase tracking-widest">Syncing members...</p>
                    </div>
                  ) : groupContacts.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-glass-border rounded-3xl bg-glass-card">
                       <Folder className="w-12 h-12 text-fg/10 mx-auto mb-4" />
                       <p className="text-sm font-black text-muted uppercase tracking-widest">Group contains no contacts</p>
                    </div>
                  ) : (
                     <div className="space-y-2">
                        {groupContacts.map(contact => (
                           <div 
                             key={contact.id} 
                             onClick={() => {
                               const next = new Set(selectedMemberIds);
                               if (next.has(contact.id)) next.delete(contact.id);
                               else next.add(contact.id);
                               setSelectedMemberIds(next);
                             }}
                             className={`flex items-center justify-between p-4 bg-glass-input border rounded-2xl cursor-pointer transition-all ${
                               selectedMemberIds.has(contact.id) ? 'border-red-500 ring-1 ring-red-500 bg-red-500/5' : 'border-glass-border hover:border-glass-border'
                             }`}
                           >
                              <div className="flex items-center">
                                 <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors ${
                                   selectedMemberIds.has(contact.id) ? 'bg-red-500 border-red-500' : 'border-glass-border bg-glass-input'
                                 }`}>
                                    {selectedMemberIds.has(contact.id) && <Check className="w-2.5 h-2.5 text-fg" />}
                                 </div>
                                 <div>
                                   <p className="font-bold text-fg leading-none mb-1.5">{contact.name || 'Anonymous'}</p>
                                   <p className="text-[10px] text-muted font-semibold font-mono">{contact.phone_number}</p>
                                 </div>
                              </div>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveContact(contact.id);
                                }}
                                className={`p-2 transition-all rounded-lg text-fg/20 hover:text-red-400 hover:bg-red-500/10 cursor-pointer`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
               
               <div className="p-6 border-t border-glass-border bg-glass-card/10 flex justify-end">
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      setActiveGroup(null);
                      setActiveGroupId(null);
                      setSearchTerm('');
                    }}
                    className="w-full sm:w-auto px-8 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all shadow-lg"
                  >
                     Done
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Available Selector Modal */}
      {showSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[55] animate-in fade-in duration-200">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-glass-border bg-glass-card/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-fg tracking-tight">Add Group Members</h3>
                  <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1">Select from main contacts registry</p>
                </div>
                <button 
                  onClick={() => {
                    setShowSelector(false);
                    setSelectorIds(new Set());
                    setSearchTerm('');
                  }}
                  className="text-muted hover:text-fg font-black text-[9px] uppercase tracking-widest cursor-pointer border border-glass-border px-3 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search contact pool..."
                  className="w-full pl-4 pr-10 py-3 bg-glass-input border border-glass-border rounded-2xl text-xs font-semibold focus:outline-none transition-all text-fg placeholder:text-fg/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-black/10 custom-scrollbar">
              {loadingAvailable ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-fg" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted">Loading directory pool...</p>
                </div>
              ) : availableContacts.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <p className="text-xs font-black uppercase tracking-widest text-fg/50">All contacts are inside this list</p>
                </div>
              ) : (
                <div className="space-y-2">
                   {availableContacts
                     .filter(c => 
                       (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (c.phone_number || '').includes(searchTerm)
                     )
                     .map(contact => (
                       <div 
                         key={contact.id} 
                         onClick={() => {
                            const next = new Set(selectorIds);
                            if (next.has(contact.id)) next.delete(contact.id);
                            else next.add(contact.id);
                            setSelectorIds(next);
                         }}
                         className={`flex items-center justify-between p-4 bg-glass-input border rounded-2xl cursor-pointer transition-all ${
                            selectorIds.has(contact.id) ? 'border-white bg-glass-card' : 'border-glass-border'
                         }`}
                       >
                          <div className="flex items-center">
                             <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${
                               selectorIds.has(contact.id) ? 'bg-white border-white' : 'border-glass-border bg-glass-input'
                             }`}>
                                {selectorIds.has(contact.id) && <Check className="w-3.5 h-3.5 text-black" />}
                             </div>
                             <div>
                               <p className="font-bold text-fg text-sm">{contact.name || 'Anonymous'}</p>
                               <p className="text-[10px] text-muted font-semibold tracking-wide font-mono mt-0.5">{contact.phone_number}</p>
                             </div>
                          </div>
                       </div>
                     ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-glass-border flex items-center justify-between bg-glass-card/10">
              <button 
                onClick={() => {
                  setShowImportModal(true);
                  setShowSelector(false);
                }}
                className="text-xs font-black text-indigo-400 hover:text-fg transition-colors uppercase tracking-widest cursor-pointer"
              >
                Import Pool
              </button>
              
              <button 
                disabled={selectorIds.size === 0 || isImporting}
                onClick={handleAddSelectedToGroup}
                className="px-6 py-3.5 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center cursor-pointer"
              >
                {isImporting ? 'Adding...' : `Add Selected (${selectorIds.size})`}
              </button>
            </div>
          </div>
        </div>
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
