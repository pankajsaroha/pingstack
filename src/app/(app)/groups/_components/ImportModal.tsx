'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, Globe, Loader2, Users, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Script from 'next/script';

interface ImportModalProps {
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (groupName: string, type: 'GOOGLE' | 'FILE' | 'EXISTING', fileOrToken?: any) => Promise<void>;
}

export default function ImportModal({ onClose, onToast, onSaved }: ImportModalProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showExistingList, setShowExistingList] = useState(false);
  const [searchContactQuery, setSearchContactQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing contacts ONCE when modal mounts
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const res = await fetch('/api/contacts');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.contacts || []);
          setAllContacts(list);
        }
      } catch (e) {
        console.error('Failed to load contacts pool', e);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, []);

  const handleToggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContactIds(next);
  };

  const handleGoogleImport = () => {
    if (!newGroupName.trim()) {
      onToast('Please enter a group name first', 'info');
      return;
    }

    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      onToast('Google Client ID not configured', 'error');
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
          await onSaved(newGroupName, 'GOOGLE', response.access_token);
          onClose();
        } catch (e) {
          onToast('Google import failed', 'error');
        } finally {
          setIsImporting(false);
        }
      },
    });
    client.requestAccessToken();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newGroupName.trim()) {
      onToast('Please enter a group name first', 'info');
      return;
    }

    setIsImporting(true);
    try {
      await onSaved(newGroupName, 'FILE', file);
      onClose();
    } catch (err) {
      onToast('Upload failed', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      onToast('Please enter a group name first', 'info');
      return;
    }

    setIsImporting(true);
    try {
      if (selectedContactIds.size > 0) {
        await onSaved(newGroupName, 'EXISTING', Array.from(selectedContactIds));
      } else {
        await onSaved(newGroupName, 'FILE');
      }
      onClose();
    } catch {
      onToast('Failed to create group', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const cleanSearch = searchContactQuery.trim().toLowerCase();
  const digitsSearch = cleanSearch.replace(/\D/g, '');

  const filteredContacts = useMemo(() => {
    if (!cleanSearch) return allContacts;
    return allContacts.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(cleanSearch);
      const rawPhone = c.phone_number || '';
      const phoneMatch = rawPhone.includes(cleanSearch) || (digitsSearch && rawPhone.includes(digitsSearch));
      return nameMatch || phoneMatch;
    });
  }, [allContacts, cleanSearch, digitsSearch]);

  const isAllFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.has(c.id));

  const handleToggleAllExisting = () => {
    const next = new Set(selectedContactIds);
    if (isAllFilteredSelected) {
      filteredContacts.forEach(c => next.delete(c.id));
    } else {
      filteredContacts.forEach(c => next.add(c.id));
    }
    setSelectedContactIds(next);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-fg mb-6 tracking-tight text-left">Create Group</h3>

        <div>
          {/* 1. Group Label Input */}
          <div className="mb-5 text-left">
            <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Group Label</label>
            <input
              type="text"
              required
              placeholder="e.g. VIP Customers"
              className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-3.5 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all font-sans"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>

          {/* 2. Population Sources (ABOVE Create Group Button) */}
          <div className="mb-6 space-y-3 text-left">
            <div className="flex justify-between items-center px-1">
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest">Populate Contacts (Optional)</label>
              <span className="text-[9px] text-muted font-medium">Auto-detects Name & Mobile</span>
            </div>

            {/* Upload File & Google Contacts Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center px-4 py-3 bg-glass-input hover:bg-white/10 border border-glass-border rounded-2xl font-black text-[10px] uppercase tracking-widest text-fg cursor-pointer transition-all outline-none"
              >
                <Upload className="w-4 h-4 mr-2 text-emerald-400" />
                Upload File
              </button>

              <button
                type="button"
                disabled={isImporting}
                onClick={handleGoogleImport}
                className="flex items-center justify-center px-4 py-3 bg-glass-input hover:bg-white/10 border border-glass-border rounded-2xl font-black text-[10px] uppercase tracking-widest text-fg cursor-pointer transition-all outline-none"
              >
                <Globe className="w-4 h-4 mr-2 text-indigo-400" />
                Google Contacts
              </button>
            </div>

            {/* Select Existing Contacts Dropdown & Checklist */}
            <div className="border border-glass-border bg-glass-card/50 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExistingList(!showExistingList)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-black uppercase tracking-widest text-fg hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-0 outline-none"
              >
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-amber-400" />
                  Select Existing Contacts
                </span>
                <span className="flex items-center text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-bold">
                  {selectedContactIds.size > 0 ? `${selectedContactIds.size} Selected` : 'Browse'}
                  {showExistingList ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </span>
              </button>

              {showExistingList && (
                <div className="p-4 border-t border-glass-border space-y-3 bg-black/20 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search existing contacts..."
                      value={searchContactQuery}
                      onChange={(e) => setSearchContactQuery(e.target.value)}
                      className="flex-1 px-3 py-2 bg-glass-input border border-glass-border rounded-xl text-xs text-fg focus:outline-none placeholder:text-fg/20 font-sans"
                    />
                    {filteredContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleAllExisting}
                        className="px-2.5 py-2 border border-glass-border hover:bg-glass-card rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 cursor-pointer shrink-0"
                      >
                        {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {loadingContacts ? (
                      <div className="py-4 text-center text-xs font-semibold text-muted">Loading contacts pool...</div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="py-4 text-center text-xs font-semibold text-muted">No contacts found in directory</div>
                    ) : (
                      filteredContacts.map((c) => {
                        const isChecked = selectedContactIds.has(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleToggleContact(c.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-glass-input border border-transparent hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-glass-border bg-glass-input'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-fg leading-none">{c.name || 'Anonymous'}</p>
                                <p className="text-[10px] text-muted font-mono tracking-tight mt-0.5">{c.phone_number}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Create Group Action Button */}
          <button
            onClick={handleCreateGroup}
            disabled={isImporting}
            className="w-full py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl cursor-pointer transition-all flex items-center justify-center border-0 outline-none"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Creating Group...</span>
              </>
            ) : selectedContactIds.size > 0 ? (
              `Create Group (${selectedContactIds.size} Contacts)`
            ) : (
              'Create Empty Group'
            )}
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.xlsx"
          onChange={handleFileImport}
        />
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      </div>
    </div>
  );
}
