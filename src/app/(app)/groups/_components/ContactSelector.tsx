'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';

interface ContactSelectorProps {
  groupId: string;
  groupContacts: any[];
  onClose: () => void;
  onAdded: (contactIds: string[]) => Promise<void>;
}

export default function ContactSelector({
  groupId,
  groupContacts,
  onClose,
  onAdded,
}: ContactSelectorProps) {
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectorIds, setSelectorIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAvailableContacts = async () => {
    setLoadingAvailable(true);
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        const groupContactIds = new Set(groupContacts.map((c) => c.id));
        const filtered = data.filter((c: any) => !groupContactIds.has(c.id));
        setAvailableContacts(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    fetchAvailableContacts();
  }, [groupId, groupContacts]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectorIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectorIds(next);
  };

  const handleAdd = async () => {
    if (selectorIds.size === 0) return;
    setSubmitting(true);
    try {
      await onAdded(Array.from(selectorIds));
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPool = availableContacts.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone_number || '').includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[55] animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-glass-border bg-glass-card/10 text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-fg tracking-tight">Add Group Members</h3>
              <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1">Select from main contacts registry</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-fg font-black text-[9px] uppercase tracking-widest cursor-pointer border border-glass-border px-3 py-1 rounded-lg bg-transparent"
            >
              Close
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search contact pool..."
              className="w-full pl-4 pr-10 py-3 bg-glass-input border border-glass-border rounded-2xl text-xs font-semibold focus:outline-none transition-all text-fg placeholder:text-fg/20 font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-black/10 custom-scrollbar text-left">
          {loadingAvailable ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-fg" />
              <p className="text-xs font-black uppercase tracking-widest text-muted">Loading directory pool...</p>
            </div>
          ) : filteredPool.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <p className="text-xs font-black uppercase tracking-widest text-fg/50">All contacts are inside this list</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPool.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleToggleSelect(contact.id)}
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

        <div className="p-6 border-t border-glass-border flex items-center justify-end bg-glass-card/10">
          <button
            disabled={selectorIds.size === 0 || submitting}
            onClick={handleAdd}
            className="px-6 py-3.5 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center cursor-pointer border-0 outline-none"
          >
            {submitting ? 'Adding...' : `Add Selected (${selectorIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
