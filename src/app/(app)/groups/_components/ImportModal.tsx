'use client';

import { useState, useRef } from 'react';
import { X, Upload, Globe, Loader2 } from 'lucide-react';
import Script from 'next/script';

interface ImportModalProps {
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (groupName: string, type: 'GOOGLE' | 'FILE', file?: File) => Promise<void>;
}

export default function ImportModal({ onClose, onToast, onSaved }: ImportModalProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          // create group + import contacts inside page handler
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-fg mb-6 tracking-tight text-left">Create Group</h3>

        <div>
          <div className="mb-6 text-left">
            <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Group Label</label>
            <input
              type="text"
              required
              placeholder="e.g. VIP Customers"
              className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-4">
            <button
              onClick={async () => {
                if (!newGroupName.trim()) {
                  onToast('Please enter a group name first', 'info');
                  return;
                }
                setIsImporting(true);
                try {
                  await onSaved(newGroupName, 'FILE');
                  onClose();
                } catch {
                  onToast('Failed to create empty group', 'error');
                } finally {
                  setIsImporting(false);
                }
              }}
              disabled={isImporting}
              className="w-full py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl cursor-pointer transition-all flex items-center justify-center border-0 outline-none"
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
          </div>
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
