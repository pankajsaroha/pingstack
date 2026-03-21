'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Folder, Trash2, Upload, Globe, Loader2 } from 'lucide-react';
import Script from 'next/script';

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
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
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
        // Filter out contacts already in the group
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
        alert(data.error || 'Failed to add contacts');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!activeGroupId) return;
    try {
      const res = await fetch(`/api/groups/${activeGroupId}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      });
      if (res.ok) {
        setGroupContacts(prev => prev.filter(c => c.id !== contactId));
      }
    } catch (e) {
      console.error(e);
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
        alert(errData.error || 'Failed to create group');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating group');
    } finally {
      if (!callback) setIsImporting(false);
    }
  };

  const handleGoogleImport = (groupId?: string) => {
    const targetGroupId = groupId || activeGroupId;
    if (!targetGroupId && !newGroupName.trim()) {
      alert('Please enter a group name first');
      return;
    }
    // ... rest of logic
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      alert('Google Client ID not configured');
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
              alert(`Group created and ${data.count} contacts imported!`);
              setNewGroupName('');
              setShowModal(false);
              setShowImportModal(false); // Close import modal
              setShowSelector(false); // Close selector if open
              fetchGroups();
              if (activeGroupId) fetchGroupContacts(activeGroupId); // Refresh contacts if in detail view
            } else {
              alert(data.error || 'Import failed');
            }
          } catch (e) {
            alert('Google import failed');
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
        alert('Contacts uploaded successfully!');
        setNewGroupName('');
        setShowModal(false);
        setShowImportModal(false);
        setShowSelector(false);
        if (activeGroupId) fetchGroupContacts(activeGroupId);
        fetchGroups();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Upload failed');
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
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Groups</h1>
        <div className="flex space-x-3">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center px-4 py-2 border border-red-200 rounded-xl shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="col-span-full bg-white/80 backdrop-blur-md p-10 mt-4 rounded-2xl border border-gray-200/60 shadow-sm text-center">
            <Folder className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-base font-semibold text-gray-900">No groups</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
          </div>
        ) : (
          groups.map(group => (
            <div 
              key={group.id} 
              className={`bg-white/80 backdrop-blur-md p-6 rounded-2xl border relative shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all group-card ${
                selectedIds.has(group.id) ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200/60'
              }`}
            >
              <div className="absolute top-4 right-4 z-30">
                <input
                  type="checkbox"
                  checked={selectedIds.has(group.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => toggleSelection(group.id, e as any)}
                  className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded-lg cursor-pointer transition-transform active:scale-90"
                />
              </div>
              <div className="flex items-center mb-4 pr-6">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mr-3 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                  <Folder className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{group.name}</h3>
              </div>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 mt-6">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-800">
                   {group.public_id}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Add/Manage Contacts clicked for:', group.id);
                    setActiveGroupId(group.id);
                    setActiveGroup(group);
                    setShowDetailModal(true);
                    fetchGroupContacts(group.id);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer hover:underline flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Contacts
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full px-4 py-3 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-black transition-colors flex items-center justify-center"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Empty Group'}
                </button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or Populate via Import</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2 text-green-500" />
                    File
                  </button>
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => handleGoogleImport()}
                    className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Globe className="w-4 h-4 mr-2 text-blue-500" />
                    Google
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors pt-2"
                >
                  Cancel
                </button>
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
         <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{activeGroup.name}</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Group Details & Contacts</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      setActiveGroup(null);
                      setActiveGroupId(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                     <Trash2 className="w-5 h-5 text-gray-400" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="font-bold text-gray-900">Members ({groupContacts.length})</h3>
                         <div className="flex space-x-2">
                           <button 
                             onClick={() => {
                               setShowSelector(true);
                               fetchAvailableContacts();
                             }}
                             className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all"
                           >
                             <Plus className="w-3 h-3 mr-1.5" />
                             Add Contacts
                           </button>
                         </div>
                  </div>

                  {loadingContacts ? (
                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                       <Loader2 className="w-8 h-8 animate-spin mb-4" />
                       <p className="text-xs font-bold">Syncing contacts...</p>
                    </div>
                  ) : groupContacts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                       <Folder className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                       <p className="text-sm text-gray-400 font-bold">This group is empty</p>
                       <button 
                         onClick={() => setShowImportModal(true)}
                         className="mt-4 text-xs font-black text-blue-600 underline"
                       >
                         Import Contacts Now
                       </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       {groupContacts.map(contact => (
                          <div key={contact.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 transition-all group">
                             <div>
                               <p className="font-bold text-gray-900">{contact.name || 'No Name'}</p>
                               <p className="text-xs text-gray-400 font-medium">{contact.phone_number}</p>
                             </div>
                             <button 
                               onClick={() => handleRemoveContact(contact.id)}
                               className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       ))}
                    </div>
                  )}
               </div>
                              <div className="p-6 border-t border-gray-100 flex justify-end">
                      <button 
                        onClick={() => {
                          setShowDetailModal(false);
                          setActiveGroup(null);
                          setActiveGroupId(null);
                          setSearchTerm('');
                        }}
                        className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all"
                      >
                         Done
                      </button>
                   </div>
                </div>
             </div>
          )}

          {/* Contact Selector Modal */}
          {showSelector && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[55]">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden border border-white/20">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Add Existing Contacts</h3>
                    <button 
                      onClick={() => {
                        setShowSelector(false);
                        setSelectorIds(new Set());
                        setSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-900 font-bold text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search by name or number..."
                      className="w-full pl-4 pr-10 py-3 bg-gray-50 border-gray-100 rounded-2xl text-sm focus:ring-1 focus:ring-blue-500 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                  {loadingAvailable ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                      <Loader2 className="w-8 h-8 animate-spin mb-3" />
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading your contacts...</p>
                    </div>
                  ) : availableContacts.length === 0 ? (
                    <div className="text-center py-20">
                      <p className="text-sm text-gray-400 font-bold mb-4">No more contacts found to add</p>
                      <button 
                        onClick={() => setShowImportModal(true)}
                        className="text-blue-600 font-black text-xs underline"
                      >
                        Import New Contacts Instead
                      </button>
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
                             className={`flex items-center justify-between p-4 bg-white border rounded-2xl cursor-pointer transition-all hover:shadow-md ${
                               selectorIds.has(contact.id) ? 'border-blue-500 ring-1 ring-blue-500 shadow-blue-50/50 bg-blue-50/30' : 'border-gray-100'
                             }`}
                           >
                              <div className="flex items-center">
                                 <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${
                                   selectorIds.has(contact.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-200 bg-white'
                                 }`}>
                                    {selectorIds.has(contact.id) && <Plus className="w-3 h-3 text-white" />}
                                 </div>
                                 <div className="pr-4">
                                   <p className="font-bold text-gray-900 text-sm">{contact.name || 'No Name'}</p>
                                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{contact.phone_number}</p>
                                 </div>
                              </div>
                           </div>
                         ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white">
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="text-xs font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest"
                  >
                    Import From File/Google
                  </button>
                  <button 
                    disabled={selectorIds.size === 0 || isImporting}
                    onClick={handleAddSelectedToGroup}
                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    {isImporting ? 'Adding...' : `Add Selected (${selectorIds.size})`}
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* Import Selection Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-white/20">
            <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight text-center">Import Contacts</h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-3xl hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
              >
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-black text-gray-900">Upload File</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">CSV or Excel</span>
              </button>
              
              <button
                onClick={() => handleGoogleImport()}
                disabled={isImporting}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-3xl hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-sm font-black text-gray-900">Google Contacts</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Sync via OAuth</span>
              </button>
              
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest mt-2"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
