'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { X, Trash2, Plus, Loader2, Folder, Check } from 'lucide-react';

const ContactSelector = lazy(() => import('./ContactSelector'));

interface GroupDetailModalProps {
  group: any;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function GroupDetailModal({ group, onClose, onToast }: GroupDetailModalProps) {
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showSelector, setShowSelector] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchGroupContacts = async (groupId: string) => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/contacts`);
      if (res.ok) {
        setGroupContacts(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (group?.id) {
      fetchGroupContacts(group.id);
    }
  }, [group?.id]);

  const handleToggleMember = (id: string) => {
    const next = new Set(selectedMemberIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMemberIds(next);
  };

  const handleRemoveContact = async (idOrIds: string | string[]) => {
    const idsToRemove = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (!confirm(`Are you sure you want to remove ${idsToRemove.length} contact(s) from this group?`)) return;

    setRemoving(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: idsToRemove })
      });
      if (res.ok) {
        setGroupContacts((prev) => prev.filter((c) => !idsToRemove.includes(c.id)));
        setSelectedMemberIds(new Set());
        onToast(`${idsToRemove.length} contact(s) removed`, 'success');
      }
    } catch (e) {
      onToast('Failed to remove contacts', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const handleAddedContacts = async (contactIds: string[]) => {
    const res = await fetch('/api/groups/add-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: group.id, contactIds })
    });
    if (res.ok) {
      fetchGroupContacts(group.id);
    } else {
      const data = await res.json();
      onToast(data.error || 'Failed to add contacts', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-t-3xl sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col h-full sm:h-auto sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 sm:p-8 border-b border-glass-border flex items-center justify-between bg-glass-card/10 text-left">
          <div>
            <h2 className="text-2xl font-black text-fg tracking-tight">{group.name}</h2>
            <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Group Directory Management</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-glass-input rounded-xl transition-colors cursor-pointer text-muted hover:text-fg bg-transparent border-0 outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-black/10 text-left">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h3 className="text-sm font-black text-fg/30 uppercase tracking-widest">Active Members ({groupContacts.length})</h3>
            <div className="flex space-x-2">
              {selectedMemberIds.size > 0 && (
                <button
                  onClick={() => handleRemoveContact(Array.from(selectedMemberIds))}
                  disabled={removing}
                  className="flex items-center px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove selected
                </button>
              )}
              <button
                onClick={() => setShowSelector(true)}
                className="flex items-center px-5 py-2.5 bg-fg text-bg hover:opacity-90 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer border-0 outline-none"
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
              {groupContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleToggleMember(contact.id)}
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
                    className="p-2 transition-all rounded-lg text-fg/20 hover:text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-0 outline-none"
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
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all shadow-lg border-0 outline-none"
          >
            Done
          </button>
        </div>
      </div>

      {showSelector && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[56]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <ContactSelector
            groupId={group.id}
            groupContacts={groupContacts}
            onClose={() => setShowSelector(false)}
            onAdded={handleAddedContacts}
          />
        </Suspense>
      )}
    </div>
  );
}
